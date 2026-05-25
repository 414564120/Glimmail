# Glimmail Architecture

## Current direction

- Single Next.js application with App Router
- Multi-user data isolation from day one
- Visual source of truth: Stitch `Glass Mail Aggregator / AetherMail`
- Providers: Gmail, Outlook, 163 Mail
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

## Implemented sync boundary

- Mailboxes are owned by `userId`; mailbox, credential, message, and sync log access is user-scoped.
- Credentials are stored in `MailboxCredential` and encrypted with AES-256-GCM before persistence.
- Gmail and Outlook use OAuth tokens with incremental read authorization before mail sync.
- 163 Mail uses an encrypted app password and IMAP.
- Manual sync imports the latest 10 INBOX messages per provider.
- Sync writes `Message` rows with `userId`, `mailboxId`, and provider-specific message IDs for deduplication.
- `createMany({ skipDuplicates: true })` prevents duplicate imports across repeated manual syncs.
- `SyncLog.message` stores safe summaries only; tokens, auth codes, secrets, and message bodies are not logged.

## Current production hardening backlog

1. Add provider rate-limit handling where APIs expose retry guidance.
2. Rotate OAuth client secrets before production use and on any suspected exposure.
3. Enforce HTTPS and production redirect URIs behind the deployment reverse proxy.
4. Add consent copy and operator runbooks for Gmail and Outlook setup.
