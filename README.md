# Glimmail

Glimmail is a low-cost, multi-user unified inbox for Gmail, Outlook, and 163 Mail. The product direction is enterprise-leaning in structure and safety, while deployment stays intentionally simple enough for a single VPS.

## Current scope

- Next.js App Router foundation
- Stitch-aligned visual shell for:
  - `/login`
  - `/mailboxes`
  - `/inbox`
- Multi-agent module boundaries
- Server-side DB-backed session cookie auth
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

Mailbox management is DB-backed with per-user isolation. The `/mailboxes` page reads live data from the database, and server actions support add/delete of mailbox accounts with provider-specific email validation (Gmail, Outlook, 163 Mail). Real OAuth, IMAP, and email sync are not yet implemented — only account record management.

## Environment

Copy `.env.example` into `.env.local` and fill the provider credentials when the integration slices begin.

## Database setup

`DATABASE_URL` points Prisma at PostgreSQL. For local development, create the database first, then run:

```bash
pnpm prisma:generate
pnpm prisma:migrate
pnpm db:seed
```

`pnpm db:seed` creates the default owner user from `GLIMMAIL_ADMIN_EMAIL` and `GLIMMAIL_ADMIN_PASSWORD`. For local dev without an `.env.local`, the defaults are:

```text
owner@aethermail.local
glimmail-dev-password
```

Set `AUTH_SECRET`, `GLIMMAIL_ADMIN_EMAIL`, and `GLIMMAIL_ADMIN_PASSWORD` before any shared or production deployment. `AUTH_SECRET` is reserved for future use; the current session implementation uses database-backed opaque tokens.

## Architecture docs

- `docs/architecture.md`
- `docs/agent-workstreams.md`

## Next implementation slices

1. Wire Gmail, Outlook, and 163 mailbox connection flows
2. Replace mock data with inbox queries and sync actions
