export {
  getUserMailbox,
  getUserMailboxes,
  getLatestSyncLog,
  getRecentSyncLogs,
  addMailbox,
  updateMailboxStatus,
  deleteMailbox,
} from "./service";
export {
  saveMailboxCredential,
  getMailboxCredential,
  deleteMailboxCredential,
} from "./credentials";
export type { MailboxProvider } from "@prisma/client";
