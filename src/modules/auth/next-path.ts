const DEFAULT_NEXT_PATH = "/inbox";
const ALLOWED_NEXT_PATHS = ["/inbox", "/mailboxes", "/settings"];

export function getSafeNextPath(
  value: FormDataEntryValue | string | null | undefined,
) {
  const nextPath = String(value || "").trim();

  if (/[\u0000-\u001F\u007F]/.test(nextPath)) {
    return DEFAULT_NEXT_PATH;
  }

  if (!nextPath.startsWith("/") || nextPath.startsWith("//")) {
    return DEFAULT_NEXT_PATH;
  }

  if (
    !ALLOWED_NEXT_PATHS.some(
      (route) =>
        nextPath === route ||
        nextPath.startsWith(`${route}/`) ||
        nextPath.startsWith(`${route}?`),
    )
  ) {
    return DEFAULT_NEXT_PATH;
  }

  return nextPath;
}
