export function getRetryAfterSeconds(response: Response): number | null {
  const retryAfter = response.headers.get("Retry-After")?.trim();
  if (!retryAfter) return null;

  const seconds = Number(retryAfter);
  if (Number.isInteger(seconds) && seconds > 0) {
    return seconds;
  }

  const retryAt = new Date(retryAfter);
  if (Number.isNaN(retryAt.getTime())) {
    return null;
  }

  const delaySeconds = Math.ceil((retryAt.getTime() - Date.now()) / 1000);
  return delaySeconds > 0 ? delaySeconds : null;
}

export function formatRateLimitMessage(
  providerName: "Gmail" | "Outlook",
  retryAfterSeconds: number | null | undefined,
): string {
  if (retryAfterSeconds) {
    return `${providerName} sync is temporarily rate limited. Please try again in about ${retryAfterSeconds} seconds.`;
  }

  return `${providerName} sync is temporarily rate limited. Please try again later.`;
}
