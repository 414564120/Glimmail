import crypto from "node:crypto";
import { decodeRfc2047 } from "./rfc2047";
import { getRetryAfterSeconds } from "./rate-limit";

export function generateOAuthState(): string {
  return crypto.randomBytes(32).toString("hex");
}

export function buildAuthorizationUrl(
  state: string,
  redirectUri: string,
  options: { requestGmailReadonly?: boolean } = {},
): string {
  const clientId = process.env.GOOGLE_CLIENT_ID;
  if (!clientId) throw new Error("GOOGLE_CLIENT_ID is not set");

  const scopes = ["openid", "email", "profile"];
  if (options.requestGmailReadonly) {
    scopes.push(GMAIL_READONLY_SCOPE);
  }

  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: redirectUri,
    response_type: "code",
    scope: scopes.join(" "),
    access_type: "offline",
    include_granted_scopes: "true",
    prompt: "consent",
    state,
  });

  return `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`;
}

interface TokenResponse {
  access_token: string;
  refresh_token?: string;
  id_token?: string;
  expires_in: number;
  token_type: string;
  scope: string;
}

const GMAIL_READONLY_SCOPE = "https://www.googleapis.com/auth/gmail.readonly";

export function hasGmailReadonlyScope(scope: string | undefined): boolean {
  return scope?.split(/\s+/).includes(GMAIL_READONLY_SCOPE) ?? false;
}

export async function exchangeCodeForTokens(
  code: string,
  redirectUri: string,
): Promise<TokenResponse> {
  const clientId = process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;

  if (!clientId || !clientSecret) {
    throw new Error("Google OAuth credentials not configured");
  }

  const response = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      code,
      client_id: clientId,
      client_secret: clientSecret,
      redirect_uri: redirectUri,
      grant_type: "authorization_code",
    }),
  });

  if (!response.ok) {
    throw new Error(`Token exchange failed`);
  }

  return response.json() as Promise<TokenResponse>;
}

interface GoogleUserInfo {
  email: string;
  email_verified?: boolean;
}

export async function getGmailProfile(
  accessToken: string,
  idToken?: string,
): Promise<{ emailAddress: string }> {
  const idTokenEmail = idToken ? getEmailFromIdToken(idToken) : null;
  if (idTokenEmail) {
    return { emailAddress: idTokenEmail };
  }

  const response = await fetch("https://openidconnect.googleapis.com/v1/userinfo", {
    headers: { Authorization: `Bearer ${accessToken}` },
  });

  if (!response.ok) {
    throw new Error(`Gmail profile fetch failed`);
  }

  const profile = (await response.json()) as GoogleUserInfo;

  if (!profile.email) {
    throw new Error(`Google profile email missing`);
  }

  return { emailAddress: profile.email.toLowerCase() };
}

export async function testGmailConnection(
  accessToken: string,
): Promise<{ success: true } | { error: "token_expired" | "connection_failed" }> {
  const response = await fetch(
    "https://openidconnect.googleapis.com/v1/userinfo",
    { headers: { Authorization: `Bearer ${accessToken}` } },
  );

  if (!response.ok) {
    if (response.status === 401) {
      return { error: "token_expired" };
    }
    return { error: "connection_failed" };
  }

  return { success: true };
}

interface RefreshTokenResponse {
  access_token: string;
  expires_in: number;
  token_type: string;
  scope: string;
  refresh_token?: string;
}

export async function refreshAccessToken(
  refreshToken: string,
): Promise<RefreshTokenResponse> {
  const clientId = process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;

  if (!clientId || !clientSecret) {
    throw new Error("Google OAuth credentials not configured");
  }

  const response = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: clientId,
      client_secret: clientSecret,
      refresh_token: refreshToken,
      grant_type: "refresh_token",
    }),
  });

  if (!response.ok) {
    throw new Error("Token refresh failed");
  }

  return response.json() as Promise<RefreshTokenResponse>;
}

// -- Gmail API sync --------------------------------------------------------

export interface GmailListEntry {
  id: string;
  threadId: string;
}

interface GmailListResponse {
  messages: GmailListEntry[];
  nextPageToken?: string;
  resultSizeEstimate: number;
}

export async function listGmailMessages(
  accessToken: string,
  maxResults = 10,
): Promise<GmailListEntry[]> {
  const params = new URLSearchParams({ maxResults: String(maxResults) });
  params.append("labelIds", "INBOX");

  const response = await fetch(
    `https://gmail.googleapis.com/gmail/v1/users/me/messages?${params.toString()}`,
    { headers: { Authorization: `Bearer ${accessToken}` } },
  );

  if (!response.ok) {
    throw await createGmailApiError(response, "Gmail list failed");
  }

  const data = (await response.json()) as GmailListResponse;
  return data.messages ?? [];
}

interface GmailHeader {
  name: string;
  value: string;
}

interface GmailMessagePart {
  mimeType: string;
  body: { size: number; data?: string };
  parts?: GmailMessagePart[];
}

interface GmailMessageResponse {
  id: string;
  threadId: string;
  snippet: string;
  internalDate: string;
  payload: {
    headers: GmailHeader[];
    body: { size: number; data?: string };
    parts?: GmailMessagePart[];
    mimeType?: string;
  };
}

export interface GmailSyncedMessage {
  messageId: string;
  threadId: string;
  sender: string;
  subject: string;
  bodyText: string;
  snippet: string;
  receivedAt: Date;
}

export async function getGmailMessage(
  accessToken: string,
  messageId: string,
): Promise<GmailSyncedMessage> {
  const response = await fetch(
    `https://gmail.googleapis.com/gmail/v1/users/me/messages/${messageId}?format=full`,
    { headers: { Authorization: `Bearer ${accessToken}` } },
  );

  if (!response.ok) {
    throw await createGmailApiError(response, "Gmail message fetch failed");
  }

  const msg = (await response.json()) as GmailMessageResponse;

  const headers = msg.payload.headers;
  const getHeader = (name: string) =>
    headers.find((h) => h.name.toLowerCase() === name.toLowerCase())?.value ?? "";

  const sender = extractSender(getHeader("From"));
  const subject = decodeRfc2047(getHeader("Subject")) || "(no subject)";
  const bodyText = extractGmailBody(msg.payload);
  const receivedAt = parseGmailDate(getHeader("Date"), msg.internalDate);

  return {
    messageId: msg.id,
    threadId: msg.threadId,
    sender,
    subject,
    bodyText,
    snippet: msg.snippet ?? "",
    receivedAt,
  };
}

function extractSender(from: string): string {
  const name = from.replace(/<[^>]*>/g, "").trim();
  if (name) return decodeRfc2047(name);
  const emailMatch = from.match(/<([^>]+)>/);
  if (emailMatch) return emailMatch[1];
  return from.trim() || "unknown";
}

function stripHtml(html: string): string {
  return html
    .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, "")
    .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, "")
    .replace(/<head[^>]*>[\s\S]*?<\/head>/gi, "")
    .replace(/<[^>]+>/g, "")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#x27;/g, "'")
    .replace(/&#(\d+);/g, (_, d) => String.fromCharCode(Number(d)))
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

function extractGmailBody(payload: GmailMessageResponse["payload"]): string {
  if (payload.parts) {
    // Prefer text/plain
    for (const part of payload.parts) {
      if (part.mimeType === "text/plain" && part.body.data) {
        return decodeBase64Url(part.body.data);
      }
      if (part.parts) {
        for (const sub of part.parts) {
          if (sub.mimeType === "text/plain" && sub.body.data) {
            return decodeBase64Url(sub.body.data);
          }
        }
      }
    }
    // Fallback to text/html, stripping tags
    for (const part of payload.parts) {
      if (part.mimeType === "text/html" && part.body.data) {
        return stripHtml(decodeBase64Url(part.body.data));
      }
      if (part.parts) {
        for (const sub of part.parts) {
          if (sub.mimeType === "text/html" && sub.body.data) {
            return stripHtml(decodeBase64Url(sub.body.data));
          }
        }
      }
    }
    // Last resort: first part with data
    for (const part of payload.parts) {
      if (part.body.data) {
        const text = decodeBase64Url(part.body.data);
        return part.mimeType === "text/html" ? stripHtml(text) : text;
      }
    }
    return "";
  }

  if (payload.body.data) {
    const text = decodeBase64Url(payload.body.data);
    return payload.mimeType === "text/html" ? stripHtml(text) : text;
  }

  return "";
}

function decodeBase64Url(data: string): string {
  const padded = data.padEnd(data.length + ((4 - (data.length % 4)) % 4), "=");
  const base64 = padded.replace(/-/g, "+").replace(/_/g, "/");
  return Buffer.from(base64, "base64").toString("utf-8");
}

function parseGmailDate(dateHeader: string, internalDate: string): Date {
  if (dateHeader) {
    const parsed = new Date(dateHeader);
    if (!isNaN(parsed.getTime())) return parsed;
  }
  if (internalDate) {
    const ms = parseInt(internalDate, 10);
    if (!isNaN(ms)) return new Date(ms);
  }
  return new Date();
}

function getEmailFromIdToken(idToken: string): string | null {
  const parts = idToken.split(".");
  if (parts.length < 2 || !parts[1]) return null;

  try {
    const payload = JSON.parse(base64UrlDecode(parts[1])) as { email?: string };
    return payload.email ? payload.email.toLowerCase() : null;
  } catch {
    return null;
  }
}

export type GmailApiErrorCode =
  | "gmail_token_expired"
  | "gmail_insufficient_scope"
  | "gmail_api_not_enabled"
  | "gmail_domain_policy"
  | "gmail_rate_limited"
  | "gmail_api_failed";

export class GmailApiError extends Error {
  constructor(
    readonly code: GmailApiErrorCode,
    readonly retryAfterSeconds?: number | null,
  ) {
    super(code);
    this.name = "GmailApiError";
  }
}

export function isGmailApiError(
  error: unknown,
): error is GmailApiError {
  return error instanceof GmailApiError;
}

async function createGmailApiError(
  response: Response,
  fallback: string,
): Promise<Error> {
  if (response.status === 401) {
    return new GmailApiError("gmail_token_expired");
  }

  const { reason, message } = await readGoogleError(response);
  const normalizedMessage = message.toLowerCase();

  if (
    reason === "insufficientPermissions" ||
    reason === "insufficient_scope" ||
    normalizedMessage.includes("insufficient authentication scopes")
  ) {
    return new GmailApiError("gmail_insufficient_scope");
  }

  if (
    reason === "accessNotConfigured" ||
    reason === "SERVICE_DISABLED" ||
    normalizedMessage.includes("gmail api has not been used") ||
    normalizedMessage.includes("it is disabled")
  ) {
    return new GmailApiError("gmail_api_not_enabled");
  }

  if (reason === "domainPolicy") {
    return new GmailApiError("gmail_domain_policy");
  }

  if (
    reason === "dailyLimitExceeded" ||
    reason === "rateLimitExceeded" ||
    reason === "userRateLimitExceeded" ||
    response.status === 429
  ) {
    return new GmailApiError(
      "gmail_rate_limited",
      getRetryAfterSeconds(response),
    );
  }

  if (response.status === 403) {
    return new GmailApiError("gmail_api_failed");
  }

  return new Error(fallback);
}

async function readGoogleError(
  response: Response,
): Promise<{ reason: string; message: string }> {
  try {
    const payload = (await response.json()) as {
      error?: {
        message?: string;
        status?: string;
        errors?: Array<{ reason?: string; message?: string }>;
      };
    };

    return {
      reason:
        payload.error?.errors?.find((entry) => entry.reason)?.reason ??
        payload.error?.status ??
        "",
      message:
        payload.error?.errors?.find((entry) => entry.message)?.message ??
        payload.error?.message ??
        "",
    };
  } catch {
    return { reason: "", message: "" };
  }
}

function base64UrlDecode(value: string): string {
  const padded = value.padEnd(value.length + ((4 - (value.length % 4)) % 4), "=");
  const base64 = padded.replace(/-/g, "+").replace(/_/g, "/");
  return Buffer.from(base64, "base64").toString("utf-8");
}
