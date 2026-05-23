import tls from "node:tls";

const DEFAULT_HOST = "imap.163.com";
const DEFAULT_PORT = 993;
const CONNECT_TIMEOUT_MS = 15_000;
const LOGIN_TAG = "G001";

function imapHost(): string {
  return process.env.MAIL163_IMAP_HOST || DEFAULT_HOST;
}

function imapPort(): number {
  return parseInt(process.env.MAIL163_IMAP_PORT || String(DEFAULT_PORT), 10);
}

export function testImapConnection(
  address: string,
  password: string,
): Promise<{ success: true } | { error: string }> {
  const host = imapHost();
  const port = imapPort();

  return new Promise((resolve) => {
    const socket = tls.connect({ host, port, rejectUnauthorized: true });
    let buffer = "";
    let step: "greeting" | "login" = "greeting";

    const timer = setTimeout(() => {
      socket.destroy();
      resolve({
        error: "Connection timed out. Please check your network.",
      });
    }, CONNECT_TIMEOUT_MS);

    function sendLogin() {
      socket.write(`${LOGIN_TAG} LOGIN "${address}" "${password}"\r\n`);
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
          clearTimeout(timer);
          socket.write(`${LOGIN_TAG} LOGOUT\r\n`);
          socket.end();
          resolve({ success: true });
          return;
        }

        if (
          buffer.includes(`${LOGIN_TAG} NO`) ||
          buffer.includes(`${LOGIN_TAG} BAD`)
        ) {
          clearTimeout(timer);
          socket.destroy();
          resolve({
            error:
              "Authentication failed. Please check your email and app password.",
          });
        }
      }
    });

    socket.on("error", (err: NodeJS.ErrnoException) => {
      clearTimeout(timer);
      if (err.code === "ENOTFOUND" || err.code === "ECONNREFUSED") {
        resolve({
          error: "Could not reach IMAP server. Please check your network.",
        });
      } else {
        resolve({
          error: "Connection failed. Please try again later.",
        });
      }
    });
  });
}
