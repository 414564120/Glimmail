# Glimmail Project Structure Snapshot

Use this snapshot before searching the whole repository. Update it whenever important modules are added, removed, or renamed.

## Root

- `README.md`: public project overview and documentation entry.
- `design-preview-zh.html`: current Awwwards-inspired visual baseline.
- `package.json`: scripts and dependency source of truth.
- `prisma.config.ts`: Prisma configuration.
- `.env.example`: safe environment variable template.
- `.env.local`: local secrets, ignored and never committed.

## Application Routes

- `src/app/layout.tsx`: root layout, fonts, metadata.
- `src/app/page.tsx`: root route.
- `src/app/login/page.tsx`: login UI.
- `src/app/login/actions.ts`: login server action.
- `src/app/register/page.tsx`: first-owner registration UI.
- `src/app/register/actions.ts`: registration server action.
- `src/app/logout/route.ts`: logout route.
- `src/app/inbox/page.tsx`: inbox, list, reader, message actions UI.
- `src/app/inbox/actions.ts`: read/unread and starred actions.
- `src/app/mailboxes/page.tsx`: connected account dashboard.
- `src/app/mailboxes/actions.ts`: mailbox add/remove, test connection, manual sync orchestration.
- `src/app/mailboxes/connect/page.tsx`: provider connection UI.
- `src/app/api/auth/gmail/*`: Gmail OAuth start and callback.
- `src/app/api/auth/outlook/*`: Outlook OAuth start and callback.

## Components

- `src/components/shell`: app shell, navigation, current legacy Aether naming.
- `src/components/brand`: app logo.
- `src/components/inbox`: inbox-specific UI such as copy-code button.
- `src/components/mailboxes`: mailbox action buttons and removal confirmation.
- `src/components/ui`: shared UI primitives.

UI redesign work should start from `docs/awwwards-design-system.md` and `design-preview-zh.html` before editing these components.

## Modules

### `src/modules/auth`

Owns users, passwords, sessions, route protection, constants, and safe login redirect paths.

Important tests:

- `src/modules/auth/next-path.test.ts`

### `src/modules/mailboxes`

Owns mailbox validation, mailbox service access, credentials, and safe return paths.

Important tests:

- `src/modules/mailboxes/return-path.test.ts`

### `src/modules/providers`

Owns provider adapters and parsing:

- `gmail.ts`
- `outlook.ts`
- `mail163.ts`
- `rfc2047.ts`
- `rate-limit.ts`

Important tests:

- `src/modules/providers/gmail.test.ts`
- `src/modules/providers/outlook.test.ts`
- `src/modules/providers/mail163.test.ts`

If provider behavior is uncertain, use official provider docs before implementation.

### `src/modules/messages`

Owns message queries, verification code extraction, and sync summary helpers.

Important tests:

- `src/modules/messages/sync-summary.test.ts`

### `src/modules/synclogs`

Owns sync log retrieval and safe activity display support.

### `src/modules/security`

Owns AES-256-GCM encryption helpers. Do not change without focused security review.

## Prisma

- `prisma/schema.prisma`: database schema.
- `prisma/client.ts`: Prisma client setup.
- `prisma/migrations`: migration history.
- `prisma/seed.ts`: owner seed.
- `prisma/seed-messages.ts`: local inbox seed.

Do not add migrations unless the task explicitly requires schema changes.

## Documentation

- `docs/development-handbook.md`: first document for all new windows.
- `docs/implementation-roadmap.md`: checkbox implementation plan.
- `docs/awwwards-design-system.md`: visual system and motion rules.
- `docs/project-structure-snapshot.md`: this file.
- `docs/architecture.md`: implementation architecture summary.
- `docs/operator-runbook.md`: local operation and real sync test flow.
- `docs/oauth-production-checklist.md`: OAuth production readiness.
- `docs/real-sync-smoke-test.md`: real-provider smoke test checklist.
- `docs/gmail-oauth-plan.md`: Gmail OAuth details.
- `docs/outlook-oauth-plan.md`: Outlook and Microsoft Graph details.

