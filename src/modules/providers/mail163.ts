import tls from "node:tls";

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
