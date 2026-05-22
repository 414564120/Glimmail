export const workstreams = [
  {
    id: "auth",
    title: "Auth",
    owner: "Agent 1",
    scope: "Login, session boundary, and user isolation",
  },
  {
    id: "mailboxes",
    title: "Mailboxes",
    owner: "Agent 2",
    scope: "Mailbox connect flows, provider status, and mailbox management",
  },
  {
    id: "providers",
    title: "Providers",
    owner: "Agent 3",
    scope: "Gmail, Outlook, and 163 integration adapters",
  },
  {
    id: "sync",
    title: "Sync",
    owner: "Agent 4",
    scope: "Manual refresh orchestration, deduplication, and sync logs",
  },
  {
    id: "messages",
    title: "Messages",
    owner: "Agent 5",
    scope: "Inbox list, message detail, filters, and verification extraction",
  },
] as const;
