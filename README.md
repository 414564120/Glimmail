# Glimmail

Glimmail is a low-cost, multi-user unified inbox for Gmail, Outlook, and 163 Mail. The product direction is enterprise-leaning in structure and safety, while deployment stays intentionally simple enough for a single VPS.

## Current scope

- Next.js App Router foundation
- Stitch-aligned visual shell for:
  - `/login`
  - `/mailboxes`
  - `/inbox`
- Multi-agent module boundaries
- Server-side signed session cookie auth
- Mock inbox data standing in for provider integrations

## Commands

```bash
pnpm dev
pnpm lint
pnpm typecheck
pnpm build
```

## Environment

Copy `.env.example` into `.env.local` and fill the provider credentials when the integration slices begin.

For local auth without an `.env.local`, the app accepts:

```text
owner@aethermail.local
glimmail-dev-password
```

Set `AUTH_SECRET`, `GLIMMAIL_ADMIN_EMAIL`, and `GLIMMAIL_ADMIN_PASSWORD` before any shared or production deployment.

## Architecture docs

- `docs/architecture.md`
- `docs/agent-workstreams.md`

## Next implementation slices

1. Add PostgreSQL + Prisma models
2. Move sessions and users from environment-backed auth into database-backed records
3. Wire Gmail, Outlook, and 163 mailbox connection flows
4. Replace mock data with inbox queries and sync actions
