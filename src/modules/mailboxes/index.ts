export {
  getUserMailbox,
  getUserMailboxes,
  getLatestSyncLog,
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
