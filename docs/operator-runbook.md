# Operator Runbook

This runbook is for local operator testing and pre-production checks for Glimmail mailbox connection and manual sync flows. Do not paste OAuth codes, tokens, client secrets, app passwords, or encrypted credential values into chat, issues, logs, or documentation.

## Local Startup Checks

1. Confirm PostgreSQL is running and reachable by the app's `DATABASE_URL`.
2. Confirm `.env.local` exists and contains the required database, auth, encryption, Google, and Microsoft values. Do not print or share the file contents.
3. Generate the Prisma client:

   ```powershell
   pnpm prisma:generate
   ```

4. Start the local app:

   ```powershell
   pnpm dev
   ```

5. Open the local URL shown by Next.js, usually `http://localhost:3000`.

## Register and Login

1. Visit `/register` if this is a fresh local database.
2. Create the first owner account with a test email and password.
3. If a user already exists, visit `/login`.
4. Sign in and confirm `/mailboxes`, `/inbox`, and `/settings` load without server errors.

## 163 Mail Test Flow

1. Go to `/mailboxes/connect?provider=mail163`.
2. Enter the 163 Mail address and the provider authorization code or app password.
3. Submit the connection form and confirm the mailbox appears on `/mailboxes`.
4. Click **Test Connection**.
5. Confirm the visible result is a safe success or safe error summary.
6. Click **Sync Now**.
7. Open `/inbox` and confirm recent messages from the 163 mailbox appear with the correct provider/source badge.
8. Click **Sync Now** again.
9. Confirm duplicate import does not occur. Message counts should either stay the same or increase only for genuinely new messages.

## Gmail Test Flow

1. Go to `/mailboxes/connect?provider=gmail`.
2. Click **Connect** and complete Google sign-in with a configured test account.
3. Return to `/mailboxes` and confirm the Gmail account appears.
4. Click **Authorize Sync** to request the `gmail.readonly` scope.
5. Click **Test Connection**.
6. Confirm the visible result is a safe success or safe error summary.
7. Click **Sync Now**.
8. Open `/inbox` and confirm recent Gmail messages appear with the correct provider/source badge.
9. Click **Sync Now** again.
10. Confirm duplicate import does not occur.

## Outlook Test Flow

1. Go to `/mailboxes/connect?provider=outlook`.
2. Click **Connect** and complete Microsoft sign-in.
3. Return to `/mailboxes` and confirm the Outlook account appears.
4. Click **Authorize Sync**. If sync had already been authorized, use **Re-authorize Sync** to refresh consent.
5. Click **Test Connection**.
6. Confirm the visible result is a safe success or safe error summary.
7. Click **Sync Now**.
8. Open `/inbox` and confirm recent Outlook messages appear with the correct provider/source badge.
9. Click **Sync Now** again.
10. Confirm duplicate import does not occur.

## Safety Checks

- Pages must not display OAuth access tokens, refresh tokens, authorization codes, client secrets, app passwords, or encrypted credential values.
- `SyncLog.message` must contain only safe summaries, such as connection status, import counts, or an actionable reconnect/re-authorize prompt.
- Do not record raw email body content in `SyncLog.message`.
- Do not copy OAuth codes, tokens, provider authorization codes, app passwords, client secrets, or raw upstream error bodies into chat, issues, screenshots, or documentation.
- If a secret or token is exposed, rotate it before continuing testing.

## Common Troubleshooting

### Gmail unverified app or test user issue

Google apps in Testing mode only allow configured test users. Add the account under the OAuth consent screen test users list, then retry Connect or Authorize Sync. Restricted scopes such as `gmail.readonly` can show an unverified app warning until Google verification is complete.

### Outlook consent or admin consent issue

For work/school accounts, tenant policy can block user consent even when a delegated permission does not require admin consent by default. Ask a tenant admin to review the app registration and consent settings, or test with a personal Microsoft account if the app registration supports it.

### 401 refresh failure

Treat repeated 401 failures after refresh as an expired, revoked, or invalid refresh token. Reconnect the mailbox or run Re-authorize Sync. Do not paste raw token errors into public logs or issues.

### 403 insufficient permission

For Gmail, re-run Authorize Sync to grant `gmail.readonly`. For Outlook, re-run Authorize Sync or Re-authorize Sync to grant `Mail.Read`. Confirm the provider app registration includes the requested permission.

### Rate limit

If the app shows a rate-limit message, wait and retry later. Do not repeatedly click Sync Now while a provider is throttling requests.

## Pre-Production Checklist

- Rotate Google, Microsoft, auth, and encryption secrets before production launch.
- Use HTTPS for the production app and OAuth redirect URIs.
- Register exact production redirect URIs:
  - `https://<domain>/api/auth/gmail/callback`
  - `https://<domain>/api/auth/outlook/callback`
- Confirm OAuth consent copy explains what mail data is read and why.
- Publish a privacy policy and terms page before requesting production OAuth verification.
- Confirm the app logo, support email, developer contact email, and authorized domains are production-ready.
- Run the real sync smoke test in `docs/real-sync-smoke-test.md`.
