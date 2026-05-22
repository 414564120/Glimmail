export type ProviderKey = "gmail" | "outlook" | "mail163";

export type ConnectedMailbox = {
  id: string;
  provider: ProviderKey;
  address: string;
  status: "active" | "expiring" | "needs-attention";
  syncedAt: string;
  unreadCount: number;
};

export const providerCatalog: Array<{
  key: ProviderKey;
  name: string;
  helper: string;
  actionLabel: string;
}> = [
  {
    key: "gmail",
    name: "Gmail",
    helper: "OAuth connection with Google mailbox scopes",
    actionLabel: "Connect Google",
  },
  {
    key: "outlook",
    name: "Outlook",
    helper: "Microsoft Graph connection for inbox access",
    actionLabel: "Connect Outlook",
  },
  {
    key: "mail163",
    name: "163 Mail",
    helper: "IMAP with app authorization code",
    actionLabel: "Add 163 mailbox",
  },
];

export const connectedMailboxes: ConnectedMailbox[] = [
  {
    id: "mbx_gmail_primary",
    provider: "gmail",
    address: "owner@gmail.com",
    status: "active",
    syncedAt: "2 minutes ago",
    unreadCount: 8,
  },
  {
    id: "mbx_outlook_ops",
    provider: "outlook",
    address: "ops@outlook.com",
    status: "expiring",
    syncedAt: "14 minutes ago",
    unreadCount: 3,
  },
  {
    id: "mbx_163_archive",
    provider: "mail163",
    address: "archive@163.com",
    status: "active",
    syncedAt: "28 minutes ago",
    unreadCount: 1,
  },
];
