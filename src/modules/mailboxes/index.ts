export { getUserMailboxes, addMailbox, deleteMailbox } from "./service";
export {
  saveMailboxCredential,
  getMailboxCredential,
  deleteMailboxCredential,
} from "./credentials";
export type { MailboxProvider } from "@prisma/client";
