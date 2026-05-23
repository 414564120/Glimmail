# Glimmail

Glimmail is a low-cost, multi-user unified inbox for Gmail, Outlook, and 163 Mail. The product direction is enterprise-leaning in structure and safety, while deployment stays intentionally simple enough for a single VPS.

## Current scope

- Next.js App Router foundation
- Stitch-aligned visual shell for:
  - `/login`
  - `/mailboxes`
  - `/inbox`
  - `/settings`
- Multi-agent module boundaries
- Server-side DB-backed session cookie auth
- First-user registration for local bootstrap
- Mock inbox data standing in for provider integrations

## Commands

```bash
pnpm dev
pnpm lint
pnpm typecheck
pnpm build
pnpm prisma:generate
pnpm prisma:format
pnpm prisma:migrate
```

## Current stage

Mailbox management is DB-backed with per-user isolation. The `/mailboxes` page reads live data from the database, and a dedicated `/mailboxes/connect?provider=...` page handles per-provider connection flows with domain-validated email input. 163 Mail app passwords are encrypted with AES-256-GCM before storage (key from `ENCRYPTION_KEY` env var). Gmail uses OAuth 2.0/OpenID Connect (`openid email profile`) with encrypted token storage for account connection. Outlook displays an OAuth placeholder and does not store any credentials yet. Server actions support add/delete of mailbox accounts with provider-specific email validation.

The `/settings` page shows the current user's email, role, connected mailbox count, and a logout button.

The `/inbox` page reads messages from the local database and supports URL-based message selection (`?message=<id>`). Each message can be marked as read/unread or starred via server actions, with per-user isolation enforced on all mutations. Verification codes are extracted from message content and displayed with a Copy Code button. Messages can come from a seed script (`pnpm run db:seed-messages`) or from manual 163 Mail sync.

163 Mail connected accounts support a connection test and manual sync via IMAP (Node.js native TLS, no npm dependencies). Sync limitations: manual trigger only, fetches 10 most recent INBOX messages, simple MIME body parsing (best-effort text extraction, no HTML rendering), no attachment support, deduplicates by Message-Id (fallback to UID). Each test and sync records a SyncLog entry (status, timestamp, safe summary — never the auth code). The `/mailboxes` page shows the 3 most recent activity entries per connected 163 or Gmail mailbox. Gmail connected accounts support OAuth 2.0 authorization code flow: the `/mailboxes/connect?provider=gmail` page redirects to Google's consent screen, the callback at `/api/auth/gmail/callback` exchanges the authorization code for tokens, and access/refresh tokens are stored encrypted in `MailboxCredential`. Gmail connected accounts support a connection test via the OIDC userinfo endpoint, with automatic access token refresh when the token has expired. Gmail sync and Outlook sync are not yet implemented.

## Environment

Copy `.env.example` into `.env.local` and fill the provider credentials when the integration slices begin.

## Database setup

`DATABASE_URL` points Prisma at PostgreSQL. For local development, create the database first, then run:

```bash
pnpm prisma:generate
pnpm prisma:migrate
pnpm db:seed
pnpm db:seed-messages
```

`pnpm db:seed` creates the default owner user from `GLIMMAIL_ADMIN_EMAIL` and `GLIMMAIL_ADMIN_PASSWORD`. For local dev without an `.env.local`, the defaults are:

```text
owner@aethermail.local
glimmail-dev-password
```

Set `AUTH_SECRET`, `GLIMMAIL_ADMIN_EMAIL`, and `GLIMMAIL_ADMIN_PASSWORD` before any shared or production deployment. `AUTH_SECRET` is reserved for future use; the current session implementation uses database-backed opaque tokens.

You can also create the first owner from `/register`. After one user exists, self-registration is closed unless `GLIMMAIL_ALLOW_REGISTRATION=true`.

## Architecture docs

- `docs/architecture.md`
- `docs/agent-workstreams.md`
- `docs/gmail-oauth-plan.md` — Gmail OAuth integration plan (draft)

## Next implementation slices

1. Wire Gmail, Outlook, and 163 mailbox connection flows
2. Replace mock data with inbox queries and sync actions
