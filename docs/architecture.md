# Glimmail Architecture

## Current direction

- Single Next.js application with App Router
- Multi-user data isolation from day one
- Visual source of truth: Stitch `Glass Mail Aggregator / AetherMail`
- Initial providers: Gmail, Outlook, 163 Mail
- Deployment target: single VPS with PostgreSQL

## Module boundaries

- `src/app`
  - Routes, layouts, and thin request entrypoints
- `src/components`
  - Shared presentation primitives
- `src/modules/auth`
  - Session, user lookup, and route protection
- `src/modules/mailboxes`
  - Mailbox ownership, connection flows, and provider metadata
- `src/modules/providers`
  - Gmail, Outlook, and 163 integration adapters
- `src/modules/sync`
  - Manual sync orchestration and audit logging
- `src/modules/messages`
  - Message queries, detail shaping, verification extraction
- `src/modules/workstreams`
  - Coordination metadata for parallel implementation

## Near-term implementation order

1. Add credential auth and route protection
2. Add PostgreSQL + Prisma schema for users, mailboxes, messages, sync logs
3. Implement mailbox connection flows
4. Implement manual sync orchestration
5. Replace mock inbox data with real query paths
