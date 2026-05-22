# Agent Workstreams

## Ownership model

One module area should have one primary owner at a time. Cross-module edits are allowed only for small contract wiring.

## Suggested lanes

1. Auth
   - login form handling
   - session utilities
   - route protection
2. Mailboxes
   - mailbox listing
   - connect forms
   - mailbox ownership enforcement
3. Providers
   - Gmail adapter
   - Outlook adapter
   - 163 IMAP adapter
4. Sync
   - refresh mailbox action
   - deduplication rules
   - sync log recording
5. Messages
   - inbox queries
   - detail queries
   - verification code extraction

## Shared contract rule

If a module changes a shared shape, update the type first and note the change in the handoff summary.
