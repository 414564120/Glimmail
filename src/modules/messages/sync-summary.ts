export function createSyncSummary(params: {
  fetchedCount: number;
  createdCount: number;
}) {
  const { fetchedCount, createdCount } = params;

  const logMessage =
    fetchedCount > 0
      ? `Fetched ${fetchedCount}, imported ${createdCount} new message${createdCount !== 1 ? "s" : ""}.`
      : "No messages in mailbox.";

  const bannerMessage =
    createdCount > 0
      ? `Imported ${createdCount} new message${createdCount !== 1 ? "s" : ""}${createdCount < fetchedCount ? ` (${fetchedCount - createdCount} already synced)` : ""}.`
      : fetchedCount > 0
        ? `All ${fetchedCount} messages already synced.`
        : "No messages found.";

  return { logMessage, bannerMessage };
}
