# Real Sync Smoke Test Checklist

Use this checklist during a real mailbox testing window. It is intentionally manual and safe to paste into a QA note as long as no secrets, tokens, authorization codes, app passwords, or raw upstream response bodies are added.

## Preconditions

- [ ] Local service URL: `http://localhost:3000` or the URL printed by `pnpm dev`.
- [ ] A Glimmail test user is ready.
- [ ] 163 Mail test account and provider authorization code or app password are ready.
- [ ] Gmail test account is added to the Google OAuth consent screen test users list, if the app is still in Testing mode.
- [ ] Outlook test account is compatible with the Azure App Registration supported account types.
- [ ] Required `.env.local` values are configured, but not printed or shared.
- [ ] Do not paste token, secret, OAuth authorization code, provider authorization code, app password, or raw upstream body into chat, issues, logs, or screenshots.

## Startup

```powershell
cd F:\code\Glimmail
pnpm prisma:generate
pnpm dev
```

## Safe Database Count Checks

Use count-only checks. Do not query `MailboxCredential.encryptedSecret`, raw message body fields, OAuth tokens, authorization codes, app passwords, or client secrets.

```powershell
pnpm exec tsx -e "import { db } from './src/lib/db'; const [mailboxes, messages, syncLogs] = await Promise.all([db.mailbox.count(), db.message.count(), db.syncLog.count()]); console.log({ mailboxes, messages, syncLogs }); await db.$disconnect();"
```

Run the count before the first sync, after the first sync, and after the duplicate sync. Expected behavior:

- `Mailbox` count increases only when a new mailbox is connected.
- `Message` count increases after first successful sync when new provider messages exist.
- `Message` count does not increase on duplicate sync unless the provider account has genuinely new messages.
- `SyncLog` count increases after connection tests and sync attempts.

## 163 Mail

- [ ] Connect: add the 163 Mail mailbox from `/mailboxes/connect?provider=mail163`.
  - Expected: mailbox appears on `/mailboxes`; no provider authorization code or app password is displayed.
- [ ] Test connection.
  - Expected: visible result is a safe success or safe error; `SyncLog.message` is a safe summary.
- [ ] Sync now.
  - Expected: recent inbox messages import; provider/source badge identifies 163 Mail.
- [ ] Duplicate sync.
  - Expected: duplicate messages are not imported; safe summary reports imported count or already-synced count.
- [ ] Inbox display.
  - Expected: preview is readable text, not raw HTML; sender, subject, and received time are visible.
- [ ] Verification code extraction.
  - Expected: if a test message contains a verification code, the extracted code is visible or searchable in the inbox detail view.

## Gmail

- [ ] Connect profile scope from `/mailboxes/connect?provider=gmail`.
  - Expected: Google consent completes and mailbox appears on `/mailboxes`.
- [ ] Authorize sync.
  - Expected: second consent grants `gmail.readonly`; Sync Now becomes available.
- [ ] Test connection.
  - Expected: visible result is safe; no token or OAuth authorization code appears in UI, URL after callback handling, or `SyncLog.message`.
- [ ] Sync now.
  - Expected: recent Gmail inbox messages import; provider/source badge identifies Gmail.
- [ ] Duplicate sync.
  - Expected: duplicate messages are not imported; `Message` count stays stable unless new Gmail messages arrived.
- [ ] Inbox display.
  - Expected: preview is readable text, not raw HTML or MIME content.
- [ ] Verification code extraction.
  - Expected: if a Gmail test message contains a verification code, the extracted code is visible or searchable in the inbox detail view.

## Outlook

- [ ] Connect profile scope from `/mailboxes/connect?provider=outlook`.
  - Expected: Microsoft consent completes and mailbox appears on `/mailboxes`.
- [ ] Authorize sync.
  - Expected: consent grants `Mail.Read`; Sync Now becomes available. If already authorized, Re-authorize Sync keeps the mailbox usable.
- [ ] Test connection.
  - Expected: visible result is safe; no token or OAuth authorization code appears in UI, URL after callback handling, or `SyncLog.message`.
- [ ] Sync now.
  - Expected: recent Outlook inbox messages import; provider/source badge identifies Outlook.
- [ ] Duplicate sync.
  - Expected: duplicate messages are not imported; `Message` count stays stable unless new Outlook messages arrived.
- [ ] Inbox display.
  - Expected: preview is readable text, not raw HTML.
- [ ] Verification code extraction.
  - Expected: if an Outlook test message contains a verification code, the extracted code is visible or searchable in the inbox detail view.

## Expected Results Summary

- [ ] `SyncLog.message` contains only safe summaries.
- [ ] Message count behavior confirms provider/mailbox deduplication.
- [ ] Provider or mailbox source badge displays correctly for 163 Mail, Gmail, and Outlook messages.
- [ ] Preview does not display raw HTML, MIME boundaries, base64 blocks, or upstream response payloads.
- [ ] Verification-code extraction works when the test email includes a code.

## Failure Record Template

```text
Provider:
Action:
Visible safe error:
Timestamp:
Expected:
Actual:
Message count before:
Message count after:
SyncLog safe summary:
Notes:
```

Do not include token, secret, raw OAuth authorization code, provider authorization code, app password, encrypted credential value, raw email body, or raw upstream response body in the failure record.
