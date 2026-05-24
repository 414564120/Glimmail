import tls from "node:tls";
import { decodeRfc2047 } from "./rfc2047";

const DEFAULT_HOST = "imap.163.com";
const DEFAULT_PORT = 993;
const CONNECT_TIMEOUT_MS = 15_000;
const LOGIN_TAG = "G001";

export type Mail163ConnectionErrorCode =
  | "authentication_failed"
  | "timeout"
  | "network_unreachable"
  | "tls_failed"
  | "unknown";

type Mail163ConnectionResult =
  | { success: true }
  | { error: Mail163ConnectionErrorCode };

export type Mail163SyncErrorCode =
  | Mail163ConnectionErrorCode
  | "inbox_open_failed"
  | "fetch_failed";

export interface SyncedMessage {
  uid: string;
  messageId: string | null;
  sender: string;
  subject: string;
  bodyText: string;
  receivedAt: Date;
}

type Mail163SyncResult =
  | { success: true; messages: SyncedMessage[] }
  | { error: Mail163SyncErrorCode };

function imapHost(): string {
  return process.env.MAIL163_IMAP_HOST || DEFAULT_HOST;
}

function imapPort(): number {
  return parseInt(process.env.MAIL163_IMAP_PORT || String(DEFAULT_PORT), 10);
}

function quoteImapString(value: string): string {
  return `"${value.replace(/\\/g, "\\\\").replace(/"/g, '\\"')}"`;
}

export function testImapConnection(
  address: string,
  password: string,
): Promise<Mail163ConnectionResult> {
  const host = imapHost();
  const port = imapPort();

  return new Promise((resolve) => {
    const socket = tls.connect({
      host,
      port,
      rejectUnauthorized: true,
      servername: host,
    });
    let buffer = "";
    let step: "greeting" | "login" = "greeting";
    let settled = false;

    function finish(result: Mail163ConnectionResult) {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      resolve(result);
    }

    const timer = setTimeout(() => {
      socket.destroy();
      finish({ error: "timeout" });
    }, CONNECT_TIMEOUT_MS);

    function sendLogin() {
      socket.write(
        `${LOGIN_TAG} LOGIN ${quoteImapString(address)} ${quoteImapString(
          password,
        )}\r\n`,
      );
      step = "login";
    }

    socket.on("data", (data: Buffer) => {
      buffer += data.toString("utf-8");

      if (step === "greeting" && buffer.includes("* OK")) {
        sendLogin();
        buffer = "";
        return;
      }

      if (step === "login") {
        if (buffer.includes(`${LOGIN_TAG} OK`)) {
          socket.write(`${LOGIN_TAG} LOGOUT\r\n`);
          socket.end();
          finish({ success: true });
          return;
        }

        if (
          buffer.includes(`${LOGIN_TAG} NO`) ||
          buffer.includes(`${LOGIN_TAG} BAD`)
        ) {
          socket.destroy();
          finish({ error: "authentication_failed" });
        }
      }
    });

    socket.on("error", (err: NodeJS.ErrnoException) => {
      if (
        err.code === "ENOTFOUND" ||
        err.code === "ECONNREFUSED" ||
        err.code === "ECONNRESET" ||
        err.code === "EHOSTUNREACH" ||
        err.code === "ENETUNREACH"
      ) {
        finish({ error: "network_unreachable" });
        return;
      }

      if (
        err.code === "CERT_HAS_EXPIRED" ||
        err.code === "DEPTH_ZERO_SELF_SIGNED_CERT" ||
        err.code === "ERR_TLS_CERT_ALTNAME_INVALID" ||
        err.code === "UNABLE_TO_VERIFY_LEAF_SIGNATURE"
      ) {
        finish({ error: "tls_failed" });
        return;
      }

      finish({ error: "unknown" });
    });

    socket.on("close", () => {
      finish({ error: "unknown" });
    });
  });
}

// -- IMAP FETCH response parser -------------------------------------------

export function parseHeaderValue(headerBlock: string, name: string): string {
  const re = new RegExp(`^${name}:\\s*([^\\r\\n]*)`, "im");
  const m = headerBlock.match(re);
  return m ? m[1].trim() : "";
}

export function decodeImapUtf8(raw: string): string {
  return decodeRfc2047(raw);
}

export function cleanBodyText(raw: string): string | null {
  if (!raw) return null;

  // Strip MIME boundary lines: --boundary and --boundary--
  let text = raw.replace(/^--[A-Za-z0-9+/=_\-\.]{10,}(--)?\s*$/gm, "");

  // Strip Content-* headers
  text = text.replace(/^Content-(Type|Transfer-Encoding|Disposition|ID|Description):\s*[^\r\n]*/gim, "");

  // Strip charset directives
  text = text.replace(/^charset\s*=\s*["']?[^"'\r\n;]+["']?;?\s*/gim, "");

  // Collapse multiple blank lines
  text = text.replace(/\n{3,}/g, "\n\n");

  const trimmed = text.trim();

  // Detect base64-encoded body regardless of "readable" heuristic
  const compact = trimmed.replace(/\s/g, "");
  if (compact.length > 40 && /^[A-Za-z0-9+/=]+$/.test(compact)) {
    try {
      const decoded = Buffer.from(compact, "base64").toString("utf-8");
      if (looksLikeReadableText(decoded)) {
        const recleaned = cleanBodyText(decoded);
        return recleaned ?? decoded.trim();
      }
    } catch {
      // Not valid base64, fall through
    }
  }

  if (!looksLikeReadableText(trimmed)) {
    return null;
  }

  return trimmed.length > 0 ? trimmed : null;
}

function looksLikeReadableText(text: string): boolean {
  const len = text.length;
  if (len === 0) return false;

  const specials = (text.match(/[^a-zA-Z0-9\s]/g) || []).length;
  if (specials / len > 0.25) return false;

  const letters = (text.match(/[a-zA-Z]/g) || []).length;
  const vowels = (text.match(/[aeiouAEIOU]/g) || []).length;
  const spaces = (text.match(/\s/g) || []).length;

  // Has word structure (multiple spaces)
  if (spaces >= 2) return true;

  // Contains CJK characters (which don't use spaces between words)
  if (/[一-鿿]/.test(text)) return true;

  // If has several letters but no vowels, it's not natural language
  if (letters > 3 && vowels === 0) return false;

  // Short, mostly-alphanumeric text could be a short message
  if (len <= 30 && (letters / len) > 0.4) return true;

  return false;
}

export function createPreview(bodyText: string, subject: string): string {
  const cleaned = cleanBodyText(bodyText);
  if (cleaned && cleaned.length >= 10) {
    return cleaned.slice(0, 200).replace(/\s+/g, " ").trim();
  }
  return subject || "(no preview)";
}

export function extractVerificationCode(text: string): string | null {
  const patterns = [
    /verification\s*code\b[^0-9]*?(\d{4,8})/i,
    /验证码\s*[:：]?\s*[^0-9]*?(\d{4,8})/,
    /\bcode\b[^0-9]*?(\d{4,8})/i,
  ];
  for (const re of patterns) {
    const m = text.match(re);
    if (m) return m[1];
  }
  return null;
}

function parseFetchResponse(data: string): SyncedMessage[] {
  const messages: SyncedMessage[] = [];
  let idx = 0;

  while (idx < data.length) {
    const fetchTag = data.indexOf("*", idx);
    if (fetchTag === -1) break;

    const afterStar = data.slice(fetchTag + 1);
    const fetchMatch = afterStar.match(/^\s*(\d+)\s+FETCH\s*\(/);
    if (!fetchMatch) {
      idx = fetchTag + 1;
      continue;
    }

    const parenStart = fetchTag + fetchMatch[0].length;
    const contentEnd = findMatchingParen(data, parenStart);
    if (contentEnd === -1) break;

    const fetchContent = data.slice(parenStart, contentEnd);
    const msg = parseOneFetchAttrs(fetchContent);
    if (msg) messages.push(msg);

    idx = contentEnd + 1;
  }

  return messages;
}

function findMatchingParen(raw: string, start: number): number {
  let depth = 1;
  let i = start;

  while (i < raw.length && depth > 0) {
    const ch = raw[i];

    if (ch === '"') {
      i = skipQuoted(raw, i);
      continue;
    }

    if (ch === "{") {
      i = skipLiteral(raw, i);
      continue;
    }

    if (ch === "(") depth++;
    if (ch === ")") depth--;
    i++;
  }

  return depth === 0 ? i - 1 : -1;
}

function skipQuoted(raw: string, start: number): number {
  let i = start + 1;
  while (i < raw.length) {
    if (raw[i] === "\\") {
      i += 2;
      continue;
    }
    if (raw[i] === '"') return i + 1;
    i++;
  }
  return raw.length;
}

function skipLiteral(raw: string, start: number): number {
  const closeBrace = raw.indexOf("}", start);
  if (closeBrace === -1) return raw.length;
  const sizeStr = raw.slice(start + 1, closeBrace);
  const size = parseInt(sizeStr, 10);
  if (isNaN(size)) return closeBrace + 1;
  // Skip past }\r\n then N bytes
  let after = closeBrace + 1;
  if (raw[after] === "\r") after++;
  if (raw[after] === "\n") after++;
  return after + size;
}

function parseOneFetchAttrs(attrs: string): SyncedMessage | null {
  let uid = "";
  let internalDate = "";
  let headerBlock = "";
  let bodyText = "";
  let i = 0;

  while (i < attrs.length) {
    // Skip whitespace
    while (i < attrs.length && attrs[i] === " ") i++;
    if (i >= attrs.length) break;

    const remaining = attrs.slice(i);

    if (remaining.startsWith("UID ")) {
      i += 4;
      const val = readAtom(attrs, i);
      uid = val.value;
      i = val.nextIdx;
      continue;
    }

    if (remaining.startsWith("INTERNALDATE ")) {
      i += 14;
      if (attrs[i] === '"') {
        const val = readQuoted(attrs, i);
        internalDate = val.value;
        i = val.nextIdx;
      }
      continue;
    }

    if (remaining.startsWith("BODY[HEADER.FIELDS")) {
      // Skip to the value (literal or NIL)
      i = skipBracketSection(attrs, i);
      if (attrs[i] === " ") i++;
      if (attrs.slice(i, i + 3) === "NIL") {
        i += 3;
      } else if (attrs[i] === "{") {
        const val = readLiteral(attrs, i);
        headerBlock = val.value;
        i = val.nextIdx;
      }
      continue;
    }

    if (remaining.startsWith("BODY[TEXT]") || remaining.startsWith("BODY[TEXT")) {
      i = skipBracketSection(attrs, i);
      if (attrs[i] === " ") i++;
      if (attrs.slice(i, i + 3) === "NIL") {
        i += 3;
      } else if (attrs[i] === "{") {
        const val = readLiteral(attrs, i);
        bodyText = val.value;
        i = val.nextIdx;
      }
      continue;
    }

    // Skip unknown attrs
    if (attrs[i] === "(") {
      i = findMatchingParen(attrs, i) + 1;
    } else if (attrs[i] === '"') {
      i = skipQuoted(attrs, i);
    } else if (attrs[i] === "{") {
      i = skipLiteral(attrs, i);
    } else {
      const atom = readAtom(attrs, i);
      i = atom.nextIdx;
    }
  }

  if (!uid) return null;

  const sender = parseHeaderValue(headerBlock, "From") || "unknown";
  const rawSubject = parseHeaderValue(headerBlock, "Subject") || "(no subject)";
  const subject = decodeImapUtf8(rawSubject);
  const messageId = parseHeaderValue(headerBlock, "Message-Id") || null;

  const rawDate = parseHeaderValue(headerBlock, "Date") || internalDate;
  const receivedAt = rawDate ? new Date(rawDate) : new Date();

  return {
    uid,
    messageId,
    sender: sender.replace(/<[^>]*>/g, "").trim(),
    subject,
    bodyText,
    receivedAt: isNaN(receivedAt.getTime()) ? new Date() : receivedAt,
  };
}

function readAtom(raw: string, start: number): { value: string; nextIdx: number } {
  let i = start;
  while (i < raw.length && raw[i] !== " " && raw[i] !== ")" && raw[i] !== "\r" && raw[i] !== "\n") {
    i++;
  }
  return { value: raw.slice(start, i), nextIdx: i };
}

function readQuoted(raw: string, start: number): { value: string; nextIdx: number } {
  let i = start + 1;
  let value = "";
  while (i < raw.length) {
    if (raw[i] === "\\") {
      value += raw[i + 1] || "";
      i += 2;
      continue;
    }
    if (raw[i] === '"') {
      return { value, nextIdx: i + 1 };
    }
    value += raw[i];
    i++;
  }
  return { value, nextIdx: raw.length };
}

function readLiteral(raw: string, start: number): { value: string; nextIdx: number } {
  const closeBrace = raw.indexOf("}", start);
  if (closeBrace === -1) return { value: "", nextIdx: raw.length };
  const size = parseInt(raw.slice(start + 1, closeBrace), 10);
  if (isNaN(size)) return { value: "", nextIdx: closeBrace + 1 };
  let after = closeBrace + 1;
  if (raw[after] === "\r") after++;
  if (raw[after] === "\n") after++;
  return { value: raw.slice(after, after + size), nextIdx: after + size };
}

function skipBracketSection(raw: string, start: number): number {
  if (raw[start] !== "B") return start;
  let i = start;
  while (i < raw.length && raw[i] !== "]") i++;
  if (raw[i] === "]") i++;
  return i;
}

// -- Sync Mailbox ---------------------------------------------------------

const SYNC_FETCH_COUNT = 10;

function parseListMailboxes(data: string): string[] {
  const names: string[] = [];

  for (const line of data.split(/\r?\n/)) {
    if (!line.match(/^\*\s+LIST\s+/i)) continue;
    if (line.match(/\\Noselect/i)) continue;

    const quotedMatch = line.match(/"((?:\\.|[^"\\])*)"\s*$/);
    const rawName = quotedMatch
      ? quotedMatch[1].replace(/\\"/g, '"').replace(/\\\\/g, "\\")
      : line.trim().split(/\s+/).at(-1);

    if (rawName && !names.includes(rawName)) {
      names.push(rawName);
    }
  }

  const inbox = names.find((name) => name.toUpperCase() === "INBOX");
  const ordered = inbox
    ? [inbox, ...names.filter((name) => name !== inbox)]
    : names;

  return ordered.length > 0 ? ordered : ["INBOX"];
}

export function syncMailbox(
  address: string,
  password: string,
): Promise<Mail163SyncResult> {
  const host = imapHost();
  const port = imapPort();

  return new Promise((resolve) => {
    const socket = tls.connect({
      host,
      port,
      rejectUnauthorized: true,
      servername: host,
    });
    let buffer = "";
    let step: "greeting" | "login" | "id" | "list" | "select" | "search" | "fetch" | "done" =
      "greeting";
    let settled = false;
    let tagSeq = 1;
    let existsCount = 0;
    let searchUids: number[] = [];
    let loginTag = "";
    let idTag = "";
    let listTag = "";
    let selectTag = "";
    let searchTag = "";
    let fetchTag = "";
    let didTryWritableSelect = false;
    let mailboxNames: string[] = [];
    let mailboxIndex = 0;

    function tag() {
      const t = `G${String(tagSeq).padStart(3, "0")}`;
      tagSeq++;
      return t;
    }

    function finish(result: Mail163SyncResult) {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      if (!socket.destroyed) {
        try { socket.end(); } catch { /* ignore */ }
      }
      resolve(result);
    }

    const timer = setTimeout(() => {
      socket.destroy();
      finish({ error: "timeout" });
    }, CONNECT_TIMEOUT_MS);

    function sendLogin() {
      loginTag = tag();
      socket.write(
        `${loginTag} LOGIN ${quoteImapString(address)} ${quoteImapString(password)}\r\n`,
      );
      step = "login";
      // Wait for loginTag OK
    }

    function sendClientId() {
      idTag = tag();
      socket.write(
        `${idTag} ID ("name" "Glimmail" "version" "0.1.0" "vendor" "Glimmail")\r\n`,
      );
      step = "id";
    }

    function sendList() {
      listTag = tag();
      socket.write(`${listTag} LIST "" "*"\r\n`);
      step = "list";
    }

    function sendSelect() {
      selectTag = tag();
      const mailboxName = mailboxNames[mailboxIndex] || "INBOX";
      socket.write(
        didTryWritableSelect
          ? `${selectTag} SELECT ${quoteImapString(mailboxName)}\r\n`
          : `${selectTag} EXAMINE ${quoteImapString(mailboxName)}\r\n`,
      );
      step = "select";
    }

    function sendSearch() {
      searchTag = tag();
      socket.write(`${searchTag} UID SEARCH ALL\r\n`);
      step = "search";
    }

    function sendFetch(uids: number[]) {
      fetchTag = tag();
      socket.write(
        `${fetchTag} UID FETCH ${uids.join(",")} (UID INTERNALDATE BODY.PEEK[HEADER.FIELDS (From Subject Date Message-Id)] BODY.PEEK[TEXT])\r\n`,
      );
      step = "fetch";
    }

    function handleResponse() {
      // Check for login failures
      if (
        step === "login" &&
        (buffer.includes(" NO ") || buffer.includes(" BAD "))
      ) {
        socket.destroy();
        finish({ error: "authentication_failed" });
        return;
      }

      // After login, check if we got OK
      if (step === "login" && lookupTaggedStatus(buffer, loginTag) === "OK") {
        sendClientId();
        buffer = "";
        return;
      }

      if (step === "id" && lookupTaggedStatus(buffer, idTag) !== null) {
        sendList();
        buffer = "";
        return;
      }

      if (step === "list" && lookupTaggedStatus(buffer, listTag) === "OK") {
        mailboxNames = parseListMailboxes(buffer);
        mailboxIndex = 0;
        didTryWritableSelect = false;
        sendSelect();
        buffer = "";
        return;
      }

      if (step === "list" && lookupTaggedStatus(buffer, listTag) !== null) {
        mailboxNames = ["INBOX"];
        mailboxIndex = 0;
        didTryWritableSelect = false;
        buffer = "";
        sendSelect();
        return;
      }

      // After select, parse EXISTS
      if (step === "select" && lookupTaggedStatus(buffer, selectTag) === "OK") {
        const existsMatch = buffer.match(/\*\s+(\d+)\s+EXISTS/);
        if (existsMatch) {
          existsCount = parseInt(existsMatch[1], 10);
        }
        if (existsCount === 0) {
          finish({ success: true, messages: [] });
          return;
        }
        buffer = "";
        sendSearch();
        return;
      }

      if (step === "select" && lookupTaggedStatus(buffer, selectTag) !== null) {
        if (!didTryWritableSelect) {
          didTryWritableSelect = true;
          buffer = "";
          sendSelect();
          return;
        }

        mailboxIndex++;
        if (mailboxIndex < mailboxNames.length) {
          didTryWritableSelect = false;
          buffer = "";
          sendSelect();
          return;
        }

        socket.destroy();
        finish({ error: "inbox_open_failed" });
        return;
      }

      // After search, parse UIDs
      if (step === "search" && lookupTaggedStatus(buffer, searchTag) === "OK") {
        const searchMatch = buffer.match(/\*\s+SEARCH\s+([\d\s]+)/i);
        if (searchMatch) {
          searchUids = searchMatch[1]
            .trim()
            .split(/\s+/)
            .map(Number)
            .filter((n) => !isNaN(n));
        }

        if (searchUids.length === 0) {
          finish({ success: true, messages: [] });
          return;
        }

        // Fetch the most recent UIDs directly; UID SEARCH returns UIDs, not sequence numbers.
        const count = Math.min(SYNC_FETCH_COUNT, searchUids.length);
        const uidsToFetch = searchUids.slice(-count);
        buffer = "";
        sendFetch(uidsToFetch);
        return;
      }

      if (step === "search" && lookupTaggedStatus(buffer, searchTag) !== null) {
        socket.destroy();
        finish({ error: "fetch_failed" });
        return;
      }

      // After fetch
      if (step === "fetch" && lookupTaggedStatus(buffer, fetchTag) === "OK") {
        const messages = parseFetchResponse(buffer);
        socket.write(`${tag()} LOGOUT\r\n`);
        socket.end();
        finish({ success: true, messages });
        return;
      }

      if (step === "fetch" && lookupTaggedStatus(buffer, fetchTag) !== null) {
        socket.destroy();
        finish({ error: "fetch_failed" });
        return;
      }
    }

    function lookupTaggedStatus(data: string, expectedTag: string): null | "OK" | "NO" | "BAD" {
      const re = new RegExp(`${expectedTag}\\s+(OK|NO|BAD)`, "i");
      const m = data.match(re);
      return m ? (m[1].toUpperCase() as "OK" | "NO" | "BAD") : null;
    }

    socket.on("data", (data: Buffer) => {
      buffer += data.toString("utf-8");

      if (step === "greeting" && buffer.includes("* OK")) {
        sendLogin();
        buffer = "";
        return;
      }

      handleResponse();
    });

    socket.on("error", (err: NodeJS.ErrnoException) => {
      if (
        err.code === "ENOTFOUND" ||
        err.code === "ECONNREFUSED" ||
        err.code === "ECONNRESET" ||
        err.code === "EHOSTUNREACH" ||
        err.code === "ENETUNREACH"
      ) {
        finish({ error: "network_unreachable" });
        return;
      }

      if (
        err.code === "CERT_HAS_EXPIRED" ||
        err.code === "DEPTH_ZERO_SELF_SIGNED_CERT" ||
        err.code === "ERR_TLS_CERT_ALTNAME_INVALID" ||
        err.code === "UNABLE_TO_VERIFY_LEAF_SIGNATURE"
      ) {
        finish({ error: "tls_failed" });
        return;
      }

      finish({ error: "unknown" });
    });

    socket.on("close", () => {
      finish({ error: "unknown" });
    });
  });
}
