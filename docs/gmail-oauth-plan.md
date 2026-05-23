# Gmail OAuth Integration Plan

Status: Phase 1 completed, Phase 2 implemented.

## Decision: Gmail API vs IMAP XOAUTH2

**Choice: Gmail API (REST), not IMAP XOAUTH2.**

Rationale:

- Gmail API is Google's recommended path for email access. It returns structured JSON, supports partial fetch (lightweight metadata-only queries), and has better rate limiting visibility.
- IMAP XOAUTH2 requires maintaining a persistent TLS connection and parsing IMAP protocol responses. It is harder to debug, harder to test, and offers no advantage for a manual-sync model.
- Gmail API lets us fetch message metadata (headers, snippet) without downloading full bodies upfront — ideal for "list messages, then fetch detail on demand" UX.
- 163 Mail uses IMAP + app password because 163 does not offer a REST API with OAuth. Gmail does — we should use the better tool for each provider.

Scopes under consideration:

| Scope | Sensitivity Tier | Verification Required | Notes |
|---|---|---|---|
| `gmail.readonly` | Restricted | Full verification + security assessment | View messages and settings |
| `gmail.modify` | Restricted | Full verification + security assessment | Read, compose, send, label mgmt (no permanent delete) |
| `gmail.metadata` | Restricted | Full verification + security assessment | Headers and labels only, no body |
| `gmail.send` | Sensitive | Additional verification | Send-only |
| `gmail.labels` | Non-sensitive | Basic verification | Labels only |

**Recommendation: start with `gmail.readonly`.** It is the narrowest scope that still allows full message content access. `gmail.modify` can be added later when we need to mark messages as read or apply labels. We will use incremental authorization so the user can review and approve additional scopes in context.

Restricted scopes require:
1. OAuth consent screen verification by Google
2. A third-party security assessment (Tier 2 or 3 depending on access level)
3. A public privacy policy URL

These are required before publishing to production. During development, apps in "Testing" mode can use restricted scopes with up to 100 test users and no verification.

Sources:
- [Choose Gmail API scopes](https://developers.google.com/workspace/gmail/api/auth/scopes)
- [OAuth 2.0 for Web Server Applications](https://developers.google.com/identity/protocols/oauth2/web-server)

---

## OAuth Consent Screen Requirements

Per [Google OAuth consent screen policy](https://developers.google.com/workspace/gmail/api/auth/scopes):

1. **App name, user support email, developer contact email** — all required.
2. **App logo** — required for production publication.
3. **Authorized domains** — must own and verify all domains used in redirect URIs, homepage links, and privacy policy URLs.
4. **Scopes** — clearly describe why each scope is needed in the consent screen text.
5. **Privacy policy URL** — required for restricted scopes.
6. **Testing vs Production mode**:
   - Testing: up to 100 test users, refresh tokens expire after 7 days, no verification needed.
   - In Production: unlimited users, refresh tokens persist, full verification required for restricted scopes.

For local development, `http://localhost:3000` and `http://localhost` are exempt from HTTPS requirement. All redirect URIs must be pre-registered in Google Cloud Console with exact scheme/host/port/path matching.

---

## Callback URL Design

```
Production:  https://<domain>/api/auth/gmail/callback
Development: http://localhost:3000/api/auth/gmail/callback
```

Design decisions:
- A single Next.js API route handles the OAuth callback. The route receives `?code=...&state=...`, exchanges the authorization code for tokens via `https://oauth2.googleapis.com/token`, encrypts and stores the tokens, and redirects the user to `/mailboxes` with a success or error query param.
- `state` parameter (a random string stored in the DB-backed session or a short-lived cookie) prevents CSRF. The callback must verify `state` before exchanging the code.

---

## Token Storage Design

### Access token

Short-lived (typically 3600 seconds / 1 hour). Stored encrypted in `MailboxCredential` with `kind = "oauth_access_token"`. The Gmail API client reads it on-demand and refreshes transparently.

### Refresh token

Long-lived (until user revokes or app is unpublished). Stored encrypted in `MailboxCredential` with `kind = "oauth_refresh_token"`.

### Reusing existing encryption

`src/modules/security/crypto.ts` provides AES-256-GCM encrypt/decrypt. We use it exactly as we do for 163 app passwords:

```ts
saveMailboxCredential(userId, mailboxId, "oauth_refresh_token", refreshToken);
saveMailboxCredential(userId, mailboxId, "oauth_access_token", accessToken);
```

The `MailboxCredential` table's `@@unique([mailboxId, kind])` constraint allows one token per kind per mailbox — a clean fit.

### Refresh token rotation

Google may issue a new refresh token on access token refresh, depending on app configuration and token age. When we receive a new refresh token:
1. Update the stored `oauth_refresh_token` credential with the new value.
2. If the old refresh token was revoked (Google returns `invalid_grant`), mark the mailbox as `error` and show a "Reconnect Gmail" prompt.

Google's [OAuth 2.0 docs](https://developers.google.com/identity/protocols/oauth2/web-server#refresh) specify that for unverified apps (Testing mode), refresh tokens expire after 7 days. For production apps, refresh tokens are long-lived unless the user revokes access or the token is unused for 6 months.

---

## Multi-User Isolation

All token access goes through `userId` checks:

```ts
// Never: db.mailboxCredential.findUnique({ where: { mailboxId } })
// Always:
const token = await getMailboxCredential(userId, mailboxId, "oauth_refresh_token");
```

`getMailboxCredential` already enforces `credential.userId !== userId` — zero changes needed.

Tokens are never:
- Passed as URL query parameters
- Written to SyncLog.message
- Included in server action redirects
- Exposed in client components or server-rendered HTML
- Logged via console.log or error traces

---

## Environment Variables

```env
# Gmail OAuth
GOOGLE_CLIENT_ID="<from GCP Console>"
GOOGLE_CLIENT_SECRET="<from GCP Console>"
# DO NOT commit these values. Use .env.local for development.
```

Existing `.env.example` already has `GOOGLE_CLIENT_ID` and `GOOGLE_CLIENT_SECRET` entries (currently empty). No new env vars needed.

The client secret must never appear in:
- Publicly accessible files or client bundles
- Git history (keep in `.env.local`, which is in `.gitignore`)
- Error messages or logs
- The plan document (use placeholder values only)

---

## Phased Implementation Plan

### Phase 1: OAuth config + docs (this document)
- Write and review this plan
- Register Gmail API in Google Cloud Console with redirect URIs
- Document the consent screen verification process timeline
- No code changes

### Phase 2: Connect/callback + encrypted token storage ✅
- Add `/api/auth/gmail/callback` route handler
- Generate `state` parameter, store in a short-lived HTTP-only cookie bound to the current user, verify on callback
- Exchange authorization code for tokens via raw `fetch`
- Store access + refresh tokens encrypted via existing `saveMailboxCredential`
- Wire the Gmail "Connect" button on `/mailboxes/connect?provider=gmail` to the Google OAuth URL (replace current placeholder)
- Handle errors: user denies consent, invalid state, token exchange failure

### Phase 3: Gmail profile/account verification
- After token storage, call `https://gmail.googleapis.com/gmail/v1/users/me/profile` to verify the account
- Display the connected Gmail address on `/mailboxes` card
- Test connection: light API call to verify token validity

### Phase 4: Manual Gmail sync (latest N messages)
- Add Gmail sync module (`src/modules/providers/gmail.ts`)
- Implement `listMessages` (metadata: ID, threadId, labels, snippet) and `getMessage` (full body, headers)
- Manual Sync Now button on connected Gmail card
- Same dedup logic as 163: `providerMessageId + mailboxId`
- Extract verification codes from Gmail message body (reuse `extractVerificationCode`)
- SyncLog recording (no tokens in message field)

### Phase 5: Refresh token handling and error UX
- Detect `401 Unauthorized` from Gmail API → attempt token refresh → retry
- If refresh fails (`invalid_grant`): mark mailbox status as `error`, show "Reconnect Gmail" prompt
- If token refresh succeeds: update stored access token, continue operation
- Rate limit awareness: respect `Retry-After` headers from Gmail API

---

## Database Schema Suggestions

These are suggestions only. Do NOT modify `schema.prisma` until the relevant phase.

The current `MailboxCredential` model:

```prisma
model MailboxCredential {
  id              String   @id @default(cuid())
  kind            String   // "app_password" | "oauth_token"
  encryptedSecret String   // AES-256-GCM ciphertext
  createdAt       DateTime @default(now())
  updatedAt       DateTime @updatedAt
  mailboxId       String
  mailbox         Mailbox  @relation(...)
  userId          String
  user            User     @relation(...)
  @@unique([mailboxId, kind])
  @@index([userId])
}
```

**Current assessment: sufficient for Phase 2–3.**

For Phase 4+, consider these optional additions (not required now):

- **Use separate `kind` values**: `"oauth_access_token"` and `"oauth_refresh_token"` instead of a single `"oauth_token"` value. This cleanly separates short-lived and long-lived tokens. The `@@unique([mailboxId, kind])` constraint supports this naturally.

- **`expiresAt`** (`DateTime?`): Stores when the access token expires, avoiding unnecessary refresh attempts. Gmail API returns `expires_in` (seconds) with each token response.

- **`scopes`** (`String?`): Stores the granted scopes as a space-delimited string (`"gmail.readonly openid email profile"`). Useful during incremental authorization to check what was actually granted.

- **`providerAccountId`** (`String?`): The Gmail account's unique ID from `users/me/profile`. Helps verify the account hasn't changed between reconnects.

- **`lastUsedAt`** (`DateTime?`): Tracks last token use for auditing and cleanup.

Example of what Phase 4 migration might look like (DO NOT RUN):

```sql
ALTER TABLE "MailboxCredential" ADD COLUMN "expiresAt" TIMESTAMPTZ;
ALTER TABLE "MailboxCredential" ADD COLUMN "scopes" TEXT;
ALTER TABLE "MailboxCredential" ADD COLUMN "providerAccountId" TEXT;
ALTER TABLE "MailboxCredential" ADD COLUMN "lastUsedAt" TIMESTAMPTZ;
```

---

## Acceptance Checklist

- [ ] OAuth consent screen configured in GCP with correct scopes
- [ ] Redirect URI registered and exact-match verified
- [ ] `/api/auth/gmail/callback` handles authorization code exchange
- [ ] CSRF state parameter generated, stored, and verified on callback
- [ ] Access token and refresh token encrypted and stored via `saveMailboxCredential`
- [ ] Gmail profile fetched and displayed on mailbox card
- [ ] Manual Sync Now fetches latest N messages via Gmail API
- [ ] Dedup by `providerMessageId + mailboxId` prevents duplicate inserts
- [ ] SyncLog records safe summary (no tokens, no email body, no secrets)
- [ ] Token refresh works silently and updates stored access token
- [ ] Token revocation / `invalid_grant` shows actionable error (not raw API error)
- [ ] All service functions enforce `userId` isolation
- [ ] No token, client secret, or auth code appears in URL, log, SyncLog, or rendered HTML
- [ ] Lint, typecheck, and build pass at each phase

## Security Checklist

- [ ] `GOOGLE_CLIENT_SECRET` in `.env.local` only, never committed or logged
- [ ] OAuth state parameter validated before code exchange (CSRF protection)
- [ ] Redirect URI matches exactly (no open redirect)
- [ ] Tokens encrypted at rest with AES-256-GCM before DB write
- [ ] Tokens never passed as URL parameters after the initial callback exchange
- [ ] Token plaintext never written to SyncLog, console, or error messages
- [ ] `getMailboxCredential` enforces `userId` match before returning decrypted token
- [ ] Google client secret rotated if ever committed or exposed
- [ ] HTTPS enforced in production (Next.js + reverse proxy)
- [ ] Consent screen text clearly explains what data the app reads and why

---

## References

- [Google Identity: OAuth 2.0 for Web Server Applications](https://developers.google.com/identity/protocols/oauth2/web-server)
- [Gmail API: Choose Scopes](https://developers.google.com/workspace/gmail/api/auth/scopes)
- [Gmail API: Users.messages.list](https://developers.google.com/workspace/gmail/api/reference/rest/v1/users.messages/list)
- [Gmail API: Users.messages.get](https://developers.google.com/workspace/gmail/api/reference/rest/v1/users.messages/get)
- [Gmail API: Users.getProfile](https://developers.google.com/workspace/gmail/api/reference/rest/v1/users/getProfile)
- [Google OAuth Consent Screen: Verification Requirements](https://support.google.com/cloud/answer/13463073)
- [Project: Crypto Module](../src/modules/security/crypto.ts)
- [Project: Credential Service](../src/modules/mailboxes/credentials.ts)
- [Project: Schema](../prisma/schema.prisma)
