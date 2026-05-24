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

Mailbox management is DB-backed with per-user isolation. The `/mailboxes` page reads live data from the database, and a dedicated `/mailboxes/connect?provider=...` page handles per-provider connection flows with domain-validated email input. 163 Mail app passwords are encrypted with AES-256-GCM before storage (key from `ENCRYPTION_KEY` env var). Gmail uses OAuth 2.0/OpenID Connect (`openid email profile`) with encrypted token storage for account connection. Outlook supports basic OAuth 2.0 connection via Microsoft identity platform (`openid profile email offline_access`). After connecting, the Outlook card shows the linked email address and a Remove button. Mail sync via Microsoft Graph is not yet implemented; the OAuth flow requests only OpenID Connect scopes for now. Token storage uses the same AES-256-GCM encryption as Gmail. Server actions support add/delete of mailbox accounts with provider-specific email validation.

The `/settings` page shows the current user's email, role, connected mailbox count, and a logout button.

The `/inbox` page reads messages from the local database and supports URL-based message selection (`?message=<id>`). Each message can be marked as read/unread or starred via server actions, with per-user isolation enforced on all mutations. Verification codes are extracted from message content and displayed with a Copy Code button. Messages can come from a seed script (`pnpm run db:seed-messages`) or from manual 163 Mail sync.

163 Mail connected accounts support a connection test and manual sync via IMAP (Node.js native TLS, no npm dependencies). Sync limitations: manual trigger only, fetches 10 most recent INBOX messages, simple MIME body parsing (best-effort text extraction, no HTML rendering), no attachment support, deduplicates by Message-Id (fallback to UID). Each test and sync records a SyncLog entry (status, timestamp, safe summary — never the auth code). The `/mailboxes` page shows the 3 most recent activity entries per connected 163 or Gmail mailbox. Gmail connected accounts support OAuth 2.0 authorization code flow: the `/mailboxes/connect?provider=gmail` page redirects to Google's consent screen, the callback at `/api/auth/gmail/callback` exchanges the authorization code for tokens, and access/refresh tokens are stored encrypted in `MailboxCredential`. Gmail connected accounts support a connection test via the OIDC userinfo endpoint, with automatic access token refresh when the token has expired. Gmail connected accounts support manual sync via the Gmail API (REST), fetching the 10 most recent INBOX messages. Sync uses `users.messages.list` + `users.messages.get` with `format=full`, extracts sender/subject/body from headers and MIME parts, deduplicates by provider message ID, and records SyncLog entries. Verification codes are extracted from message bodies. Outlook sync is not yet implemented.

## Environment

Copy `.env.example` into `.env.local` and fill the provider credentials when the integration slices begin.

## Gmail OAuth testing

When testing Gmail OAuth locally:

- **Gmail API must be enabled** in the Google Cloud Console project. Without it, Sync Now returns "Gmail API is not enabled."
- **OAuth consent screen** must include the test Google account under "Test users" (APIs & Services → OAuth consent screen). Otherwise Google shows an access-denied page before the callback fires.
- **Sync authorization** requires the `gmail.readonly` scope. Basic Gmail Connect only requests `openid email profile` — open the connected Gmail card and click **Authorize Sync** to request inbox read access in a separate OAuth step.
- **Google "unverified app" page** (yellow warning screen) is expected in testing mode. If that page hangs or loops, try a different network or VPN exit node — some Google endpoints are region-blocked.

## Outlook OAuth testing

When testing Outlook OAuth locally:

1. **Azure App Registration**: Create an app in the Azure portal with:
   - Supported account types: "Accounts in any organizational directory and personal Microsoft accounts"
   - Redirect URI: `http://localhost:3000/api/auth/outlook/callback` (Web platform)
   - API permissions (delegated): `openid`, `profile`, `email`, `offline_access`, `User.Read` (no admin consent required)
2. **Client secret**: Create one under Certificates & secrets. Copy the value into `.env.local` as `MICROSOFT_CLIENT_SECRET`.
3. **Environment variables** in `.env.local`:
   ```
   MICROSOFT_CLIENT_ID="<Application (client) ID from Overview>"
   MICROSOFT_CLIENT_SECRET="<secret value from Certificates & secrets>"
   ```
   `MICROSOFT_REDIRECT_URI` is optional — defaults to `http://localhost:3000/api/auth/outlook/callback`.
4. **Visit** `/mailboxes/connect?provider=outlook` and click **Connect with Microsoft**.
5. After signing in, you should return to `/mailboxes` with "connected successfully" and see your email address on the Outlook card.
6. **Email extraction**: The callback tries `email` → `preferred_username` → `upn` from the id_token, then falls back to `GET /v1.0/me` (requires `User.Read`). If the id_token contains the email claim, `/me` is never called.
7. **Token storage**: `oauth_access_token`, `oauth_refresh_token`, and `oauth_granted_scope` are stored encrypted in `MailboxCredential`. No tokens appear in URLs, logs, or rendered pages.
8. **Test Connection**: When connected, the Outlook card shows a **Test Connection** button. It calls `GET /v1.0/me` via Microsoft Graph. On 401, it automatically refreshes the access token and retries. Success records a SyncLog entry ("Microsoft account verified.") and sets the mailbox to active. Refresh failure prompts "Reconnect Outlook."
9. **Sync authorization**: Mail sync requires the `Mail.Read` delegated permission. Basic Outlook Connect only requests `openid profile email offline_access User.Read` — open the connected Outlook card and click **Authorize Sync** to request `Mail.Read` in a separate OAuth step. The `Mail.Read` permission must be added in the Azure portal under API permissions. Once authorized, the button changes to **Re-authorize Sync**. Actual mail sync is not yet implemented.



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
- `docs/outlook-oauth-plan.md` — Outlook / Microsoft Graph OAuth integration plan (draft)

## Next implementation slices

1. Wire Gmail, Outlook, and 163 mailbox connection flows
2. Replace mock data with inbox queries and sync actions
