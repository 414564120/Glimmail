import { isValidProvider } from "./validation";

export const MAILBOX_CONNECT_FALLBACK_PATH =
  "/mailboxes?error=connection_failed";

export function getSafeMailboxConnectReturnPath(
  value: FormDataEntryValue | string | null | undefined,
): string {
  const returnPath = String(value || "").trim();
  if (/[\u0000-\u001F\u007F]/.test(returnPath)) {
    return MAILBOX_CONNECT_FALLBACK_PATH;
  }

  if (returnPath === "/mailboxes/connect") {
    return returnPath;
  }

  if (!returnPath.startsWith("/mailboxes/connect?")) {
    return MAILBOX_CONNECT_FALLBACK_PATH;
  }

  const params = new URLSearchParams(returnPath.slice("/mailboxes/connect?".length));
  const provider = params.get("provider");
  if (provider && isValidProvider(provider)) {
    return returnPath;
  }

  return MAILBOX_CONNECT_FALLBACK_PATH;
}
