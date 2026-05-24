# Outlook / Microsoft Graph OAuth Integration Plan

Status: Implemented for local manual sync.

---

## Decision: Microsoft Graph API vs IMAP XOAUTH2

**Choice: Microsoft Graph API (REST), not IMAP XOAUTH2.**

Rationale:

- Microsoft Graph API is Microsoft's recommended path for accessing Outlook/Exchange mailboxes. It returns structured JSON, supports `$select` for lightweight queries, and has per-endpoint rate limiting with clear `Retry-After` headers.
- IMAP XOAUTH2 requires persistent TLS connections and IMAP protocol parsing — identical complexity to the 163 Mail integration, but without the benefit that drove the 163 decision (163 has no REST API with OAuth).
- Graph API gives us `/me/mailFolders/inbox/messages` for direct inbox access with `$orderby` and `$top` query params, plus `$select` for property-level fetch optimization.
- Consistent architecture: Gmail → Gmail REST API, Outlook → Microsoft Graph REST API, 163 Mail → IMAP app password. Each provider uses its best available transport.

Sources:

- [Microsoft Graph: List messages](https://learn.microsoft.com/en-us/graph/api/user-list-messages?view=graph-rest-1.0)
- [Microsoft Graph: Get message](https://learn.microsoft.com/en-us/graph/api/message-get?view=graph-rest-1.0)
- [Microsoft identity platform: OAuth 2.0 authorization code flow (v2)](https://learn.microsoft.com/en-us/entra/identity-platform/v2-oauth2-auth-code-flow)
- [Microsoft Graph permissions reference](https://learn.microsoft.com/en-us/graph/permissions-reference)

---

## Azure App Registration

### Supported account types

**Recommendation: "Accounts in any organizational directory and personal Microsoft accounts"**

| `signInAudience` (Manifest) | Scope |
|---|---|
| `AzureADandPersonalMicrosoftAccount` | Work/school accounts (any Entra ID tenant) **and** personal Microsoft accounts (Outlook.com, Hotmail, Live) |

Rationale: Gmail OAuth allows any Google account. Parity for Microsoft — accept both corporate (Entra ID) and consumer (MSA) accounts.

Alternative: For a business-focused deployment, use `AzureADMultipleOrgs` (work/school accounts only, no personal MSAs). The Graph API endpoints and token flow are identical; only the authorization endpoint tenant differs.

### Redirect URI

| Environment | URI |
|---|---|
| Development | `http://localhost:3000/api/auth/outlook/callback` |
| Production | `https://<domain>/api/auth/outlook/callback` |

- Must be registered under **Authentication → Add a platform → Web** in the Azure portal.
- `localhost` with HTTP is allowed for development registration.
- Production must use HTTPS.
- Exact scheme/host/port/path matching required.

### Client secret

- Created at **Certificates & secrets → New client secret**.
- Stored in `MICROSOFT_CLIENT_SECRET` environment variable (`.env.local`) — never committed.
- Expiration: 24 months max (Azure portal default). Rotate before expiry.

### API permissions (delegated)

| Permission | Type | Admin consent required | Purpose |
|---|---|---|---|
| `openid` | Delegated | No | Sign users in; returns `sub` claim in ID token |
| `profile` | Delegated | No | Get given_name, surname, preferred_username from ID token |
| `email` | Delegated | No | Get user's primary email address (`email` claim) |
| `offline_access` | Delegated | No | Receive refresh token for long-lived access (90-day sliding window) |
| `Mail.Read` | Delegated | **No** (user consent) | Read user's mail via `/me/mailFolders/inbox/messages` |

Additional notes:

- No admin consent required for `Mail.Read`; individual users can consent in testing. Organizations may restrict this — see User consent section below.
- `Mail.ReadBasic` exists as a lower-privilege alternative (metadata only, no body). We use `Mail.Read` for full body access (verification code extraction).
- `Mail.ReadWrite` and `Mail.Send` are explicitly excluded — read-only scope follows the Gmail `gmail.readonly` precedent.

### User consent / admin consent

- **Testing mode** (default in `AzureADandPersonalMicrosoftAccount`): individual users grant consent to `Mail.Read` at the Microsoft consent screen. No admin approval needed.
- **Enterprise tenants** may disable user consent globally. In that case, an Entra ID admin must grant tenant-wide admin consent via **API permissions → Grant admin consent for {tenant}**.
- Microsoft's consent screen shows each scope with a user-visible label. `Mail.Read` appears as **"Read your mail"**.

Sources:

- [Microsoft identity platform: Scopes and permissions](https://learn.microsoft.com/en-us/entra/identity-platform/scopes-oidc)
- [Supported account types](https://learn.microsoft.com/en-us/entra/identity-platform/v2-supported-account-types)

---

## Recommended Scopes

### Authorization request scope parameter

**Phase 2 (basic connect, implemented):**
```
openid profile email offline_access User.Read
```

**Mail sync authorization (implemented):** add `Mail.Read` via incremental consent.

Each scope explained:

| Scope | Purpose | ID Token Claims | Notes |
|---|---|---|---|
| `openid` | Sign in user (OIDC) | `sub` (unique user ID) | Required for OIDC. Appears as "Sign you in" on consent screen. |
| `profile` | Basic profile info | `given_name`, `family_name`, `preferred_username` | Enriches ID token; avoids a separate `/me` Graph call for profile. |
| `email` | Primary email address | `email` | Used to identify which Outlook mailbox to create (`mailbox.address`). Note: `email` claim may be absent for some account types (e.g., Entra External Identities). Fallback to `preferred_username`, then `upn` from id_token; Graph `/me` as last resort. |
| `offline_access` | Long-lived refresh token | — | Required on v2 endpoint to receive a `refresh_token`. Without it, the authorization code flow returns only an access token. Appears as "Maintain access to data you have given it access to." |
| `User.Read` | Read user profile via Graph | — | Required for `GET /v1.0/me` fallback when id_token email is unavailable. Delegated permission (no admin consent needed). Appears as "Read your profile." |
| `Mail.Read` | Read user mail | — | Delegated permission to read mail via Microsoft Graph. Appears as "Read your mail." |

### Incremental authorization

Microsoft identity platform supports incremental consent: if `Mail.Read` is not requested at initial connect, it can be added later via a second authorization request with only the new scope. The consent screen will only prompt for the new scope. This mirrors the Gmail "Connect" vs "Authorize Sync" split.

Sources:

- [OIDC scopes (openid, profile, email, offline_access)](https://learn.microsoft.com/en-us/entra/identity-platform/scopes-oidc)
- [Microsoft Graph Mail.Read permission](https://learn.microsoft.com/en-us/graph/permissions-reference#mail-permissions)

---

## Callback URL Design

```
Production:  https://<domain>/api/auth/outlook/callback
Development: http://localhost:3000/api/auth/outlook/callback
```

Design decisions (mirror Gmail pattern):

- Single Next.js Route Handler at `/api/auth/outlook/callback`:
  1. Validate CSRF `state` cookie against the `state` query parameter.
  2. On mismatch → redirect to `/mailboxes?error=` with "Authorization failed: invalid state."
  3. Extract `code` from query string.
  4. Exchange `code` for tokens via `POST https://login.microsoftonline.com/common/oauth2/v2.0/token`.
  5. If exchange fails → redirect to `/mailboxes?error=` with classification (user denied, tenant policy, etc.).
  6. On success:
     - Derive email from ID token `email` claim → fallback `/v1.0/me` Graph call.
     - Create or update `Mailbox` record.
     - Encrypt and store `access_token`, `refresh_token`, and granted scope string via `saveMailboxCredential`.
  7. Redirect to `/mailboxes?success=` with "Outlook connected."

- `redirect()` must NOT be called inside try/catch blocks (Next.js `NEXT_REDIRECT` behavior).

Sources:

- [Microsoft identity platform: Authorization code flow](https://learn.microsoft.com/en-us/entra/identity-platform/v2-oauth2-auth-code-flow)
- [Microsoft Graph: Get user (/me)](https://learn.microsoft.com/en-us/graph/api/user-get?view=graph-rest-1.0)

---

## Token Storage

Reuse existing `MailboxCredential` model and AES-256-GCM encryption from `src/modules/security/crypto.ts`:

```
kind: "oauth_access_token"    → encrypted access_token
kind: "oauth_refresh_token"   → encrypted refresh_token
kind: "oauth_granted_scope"   → encrypted scope string (e.g., "openid profile email offline_access Mail.Read")
```

Design decisions (same as Gmail):

- No new Prisma migration required. Current `MailboxCredential` table (`@@unique([mailboxId, kind])`) is sufficient.
- Tokens are encrypted at rest before DB write. Plaintext never enters the DB.
- `getMailboxCredential(userId, mailboxId, kind)` is the single read path — already `userId`-gated.
- No token plaintext in logs, SyncLog, redirect URLs, or rendered HTML.

Refresh token rotation:

- Microsoft identity platform issues a **new refresh token** on every `/token` call with `grant_type=refresh_token`.
- The old refresh token is not immediately revoked (it remains valid until its remaining lifetime), but should be discarded.
- Implementation: after each refresh, overwrite `oauth_refresh_token` credential with the new value.
- If refresh fails with `invalid_grant` → refresh token revoked/expired → mark mailbox `error` → show "Reconnect Outlook."

Token lifetimes:

| Token | Default lifetime | Notes |
|---|---|---|
| Access token | 60 minutes | Configurable via Entra admin, default is 1 hour |
| Refresh token | 90 days sliding window | Each refresh resets the 90-day counter. SPA tokens are fixed 24 hours, but our scenario (confidential web app) uses the 90-day variant. |
| ID token | N/A (short-lived) | Used only at callback for `email` extraction; not stored |

Sources:

- [Refresh tokens in the Microsoft identity platform](https://learn.microsoft.com/en-us/entra/identity-platform/refresh-tokens)
- [Project: Crypto Module](../src/modules/security/crypto.ts)
- [Project: Credential Service](../src/modules/mailboxes/credentials.ts)
- [Project: Schema](../prisma/schema.prisma)

---

## Multi-User Isolation

All data access follows existing userId-gating:

```
Mailbox        → @userId field, all queries filtered by userId
Credential     → @userId field, getMailboxCredential(userId, ...) gated
Message        → @userId field, createMany includes userId
SyncLog        → @userId field, createSyncLog includes userId
```

Pattern:

```ts
// In authorization callback, sync action, etc.:
const user = await getCurrentUser();
if (!user) redirect("/login");

const mailbox = await getUserMailbox(user.id, mailboxId);
// getUserMailbox internally filters by userId
```

No additional schema changes needed for multi-user isolation — existing fields and query patterns handle it.

---

## Token Refresh and Reconnect Outlook UX

### Refresh flow

1. `syncOutlookAction` reads `oauth_access_token` from credential storage.
2. Calls Microsoft Graph `/me/mailFolders/inbox/messages`.
3. If Graph returns `401 Unauthorized`:
   - Read `oauth_refresh_token`.
   - Call `POST /common/oauth2/v2.0/token` with `grant_type=refresh_token`.
   - On success: overwrite `oauth_access_token` and `oauth_refresh_token` with new values. Retry Graph call.
   - On failure (`invalid_grant`, token revoked, tenant policy): mark mailbox status `error`, record SyncLog with safe error message.
4. If Graph returns `403 Forbidden` (insufficient consent):
   - Likely cause: user revoked `Mail.Read` in Microsoft account settings, or admin removed consent.
   - Show actionable error: "Mail read access revoked. Please re-authorize this mailbox."

### Reconnect Outlook UX

When a mailbox enters `error` status with a token-related error, the current implementation uses safe action messages and re-authorization prompts:

- The `/mailboxes` page shows the Outlook card with an **error banner**.
- Card action: **Re-authorize Sync** redirects to Microsoft consent for `Mail.Read`.
- After reconnection, `oauth_access_token`, `oauth_refresh_token`, and `oauth_granted_scope` are overwritten with new tokens.
- Old `providerMessageId` values remain in DB → `skipDuplicates: true` prevents re-import of existing messages.

This mirrors the Gmail "Reconnect Gmail" UX already implemented.

Sources:

- [Microsoft identity platform: Refresh tokens](https://learn.microsoft.com/en-us/entra/identity-platform/refresh-tokens)
- [Project: Gmail sync action](../src/app/mailboxes/actions.ts) — existing `syncGmailInbox` token refresh pattern at lines 397–452

---

## Email Sync Design

### Sync boundary (minimum viable)

| Parameter | Value |
|---|---|
| Trigger | Manual "Sync Now" button on connected Outlook card |
| Folder | INBOX only |
| Max messages | 10 (via `$top=10`) |
| Sort | `receivedDateTime DESC` |
| Dedup | `providerMessageId + mailboxId` unique constraint, `createMany({ skipDuplicates: true })` |
| Background tasks | None |
| Attachments | Not fetched |

### Graph API endpoint

```
GET https://graph.microsoft.com/v1.0/me/mailFolders/inbox/messages
    ?$top=10
    &$orderby=receivedDateTime DESC
    &$select=id,subject,from,receivedDateTime,bodyPreview,body,internetMessageId
```

Response fields used:

| Field | Maps to | Notes |
|---|---|---|
| `id` | `providerMessageId` | Opaque Graph message ID. Dedup key. |
| `subject` | `subject` | Graph API returns decoded (UTF-8) values; no RFC 2047 decode needed. |
| `from.emailAddress.name` | `sender` (display name) | May be empty for email-only senders; fallback to `from.emailAddress.address`. |
| `from.emailAddress.address` | `senderEmail` (optional, not in current schema) | For future use — see notes below. |
| `receivedDateTime` | `receivedAt` | ISO 8601 UTC. Parse with `new Date()`. |
| `bodyPreview` | `preview` | Graph API provides a plain-text preview (first ~255 chars). Always clean — no HTML, no base64, no boundary markers. |
| `body.content` | `bodyText` | Encoded per `body.contentType` (`"text"` or `"html"`). If `"text"` → use directly. If `"html"` → strip HTML tags with same `stripHtml()` used in Gmail path. |
| `internetMessageId` | (dedup backup) | Not stored currently, but could serve as secondary dedup if Graph message ID changes. |

### `body` handling

Microsoft Graph returns body in the format specified by `body.contentType`:

- `contentType: "text"` → plain text, use directly as `bodyText`.
- `contentType: "html"` → HTML body. Apply `stripHtml()` from `src/modules/providers/gmail.ts` to extract readable text.

Graph does not return MIME parts (`format=full` equivalent requires a separate `$value` endpoint). The `body` field is sufficient for verification code extraction and preview generation.

### Preview strategy

- **Primary**: `bodyPreview` — Microsoft Graph auto-generated plain-text preview. Always clean.
- **Fallback**: `createPreview(bodyText, subject)` — reuses existing `mail163.ts` function which strips MIME boundaries, Content-Type headers, base64 blocks, and validates readability.

### Sender extraction

```ts
function extractOutlookSender(from: { emailAddress?: { name?: string; address?: string } }): string {
  const name = from?.emailAddress?.name?.trim();
  if (name) return name;
  const address = from?.emailAddress?.address?.trim();
  return address || "unknown";
}
```

Microsoft Graph returns sender with structured `emailAddress` object — no angle-bracket parsing needed (unlike Gmail's raw `From` header). RFC 2047 encoded names are already decoded by Graph.

### Verification code extraction

Reuse `extractVerificationCode(bodyText)` from `src/modules/providers/mail163.ts` — identical logic: regex patterns for English `verification code`, Chinese `验证码`, and generic `code:` prefix.

### De-duplication

```ts
@@unique([providerMessageId, mailboxId])  // already exists in Prisma schema
```

`createMany({ skipDuplicates: true })` — identical to Gmail and 163 Mail sync.

### Second-sync banner

```
All 10 messages already synced.
```

Same logic as `importGmailMessages`:

```ts
const bannerMessage =
  createdCount > 0
    ? `Imported ${createdCount} new message${...}`
    : fetchedCount > 0
      ? `All ${fetchedCount} messages already synced.`
      : "No messages found.";
```

Sources:

- [Microsoft Graph: List messages](https://learn.microsoft.com/en-us/graph/api/user-list-messages?view=graph-rest-1.0)
- [Microsoft Graph: Get message](https://learn.microsoft.com/en-us/graph/api/message-get?view=graph-rest-1.0)
- [Microsoft Graph: Outlook mail overview](https://learn.microsoft.com/en-us/graph/outlook-mail-concept-overview)

---

## Environment Variables

```env
# Outlook / Microsoft Graph OAuth
MICROSOFT_CLIENT_ID="<from Azure portal — App Registration > Overview>"
MICROSOFT_CLIENT_SECRET="<from Azure portal — Certificates & secrets>"
# DO NOT commit these values. Use .env.local for development.
```

Add entries to `.env.example` with empty values.

---

## Implementation Phases

### Phase 1: Planning (this document)
- [x] Write and review this plan
- [x] Register app in Azure portal with redirect URIs and permissions for local testing
- [x] Document consent screen and verification notes

### Phase 2: Connect/callback + encrypted token storage
- [x] Add `/api/auth/outlook/callback` route handler
- [x] Add `/api/auth/outlook/start` route handler (redirects to Microsoft consent screen)
- [x] Build Microsoft authorization URL with correct scopes and state
- [x] Exchange authorization code for tokens via raw `fetch`
- [x] Extract email from ID token or Graph `/me` fallback
- [x] Store access + refresh tokens encrypted via `saveMailboxCredential`
- [x] Wire Outlook "Connect" button to `/api/auth/outlook/start?scope=connect`
- [x] Handle errors: user denies consent, invalid state, token exchange failure, email missing from ID token

### Phase 3: Connection test
- [x] Test connection via `GET /v1.0/me` (lightweight call)
- [x] On 401: refresh token → retry
- [x] Display connected Outlook address on `/mailboxes` card

### Phase 4: Incremental authorization for Mail.Read
- [x] Wire "Authorize Sync" button (when user connected without `Mail.Read`)
- [x] Second authorization request adds `Mail.Read`
- [x] Update `oauth_granted_scope` credential with expanded scope
- [x] Sync Now becomes available after scope granted

### Phase 5: Manual sync
- [x] Add `syncOutlookAction` server action on connected Outlook card
- [x] Implement `listOutlookMessages` via `GET /me/mailFolders/inbox/messages?$top=10&$orderby=receivedDateTime DESC`
- [x] Extract sender/subject/body/preview from Graph response
- [x] Same dedup logic: `skipDuplicates: true`
- [x] Extract verification codes via `extractVerificationCode`
- [x] Token refresh on 401 retry
- [x] SyncLog recording (no tokens in message)
- [ ] Future enhancement: add rate-limit/backoff handling for Graph `Retry-After`

---

## Acceptance Checklist

- [x] Azure App Registration created with correct account type and redirect URI for local testing
- [x] `Mail.Read` delegated permission added and consented
- [x] `/api/auth/outlook/callback` handles authorization code exchange
- [x] CSRF state parameter generated, stored, and verified on callback
- [x] Access token and refresh token encrypted and stored via `saveMailboxCredential`
- [x] Email identified from ID token, with `/me` Graph fallback
- [x] Connection test (GET `/me`) succeeds with valid token
- [x] Manual Sync Now fetches latest 10 inbox messages via Graph API
- [x] Body `contentType: "html"` is stripped before storage and display
- [x] Dedup by `providerMessageId + mailboxId` prevents duplicate inserts
- [x] SyncLog records safe summary (no tokens, no email body, no secrets)
- [x] Token refresh works silently and updates stored access + refresh tokens
- [x] Token revocation / `invalid_grant` shows safe reconnect or re-authorization prompt
- [x] All service functions enforce `userId` isolation
- [x] No token, client secret, or auth code appears in URL, log, SyncLog, or rendered HTML
- [x] Lint, typecheck, and build pass at each phase

---

## Security Checklist

- [x] `MICROSOFT_CLIENT_SECRET` in `.env.local` only, never committed or logged
- [x] OAuth state parameter validated before code exchange (CSRF protection)
- [x] Redirect URI matches exactly the Azure portal registration (no open redirect)
- [x] Tokens encrypted at rest with AES-256-GCM before DB write
- [x] Tokens never passed as URL parameters after the initial callback exchange
- [x] Token plaintext never written to SyncLog, console, or error messages
- [x] `getMailboxCredential` enforces `userId` match before returning decrypted token
- [ ] Microsoft client secret rotated before expiry (max 24 months) and on any suspected exposure
- [ ] HTTPS enforced in production (Next.js + reverse proxy)
- [ ] Consent screen text clearly describes what data the app reads and why
- [x] `Mail.ReadWrite` and `Mail.Send` are NOT requested (read-only principle)
- [x] Verify `internetMessageId` is not stored or displayed in plaintext — it's an opaque identifier, not a secret

---

## References

- [Microsoft identity platform: OAuth 2.0 authorization code flow (v2)](https://learn.microsoft.com/en-us/entra/identity-platform/v2-oauth2-auth-code-flow)
- [Microsoft identity platform: Scopes and permissions](https://learn.microsoft.com/en-us/entra/identity-platform/scopes-oidc)
- [Microsoft identity platform: Supported account types](https://learn.microsoft.com/en-us/entra/identity-platform/v2-supported-account-types)
- [Microsoft identity platform: Refresh tokens](https://learn.microsoft.com/en-us/entra/identity-platform/refresh-tokens)
- [Microsoft Graph: List messages](https://learn.microsoft.com/en-us/graph/api/user-list-messages?view=graph-rest-1.0)
- [Microsoft Graph: Get message](https://learn.microsoft.com/en-us/graph/api/message-get?view=graph-rest-1.0)
- [Microsoft Graph: Outlook mail overview](https://learn.microsoft.com/en-us/graph/outlook-mail-concept-overview)
- [Microsoft Graph permissions reference](https://learn.microsoft.com/en-us/graph/permissions-reference)
- [Azure: App Registration overview](https://learn.microsoft.com/en-us/entra/identity-platform/quickstart-register-app)
- [Project: Gmail OAuth Plan](./gmail-oauth-plan.md)
- [Project: Crypto Module](../src/modules/security/crypto.ts)
- [Project: Credential Service](../src/modules/mailboxes/credentials.ts)
- [Project: Schema](../prisma/schema.prisma)
