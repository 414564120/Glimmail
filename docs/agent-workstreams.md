# Agent Workstreams

## Ownership model

Codex owns final integration and verification. A module area should have one primary worker at a time. Cross-module edits are allowed only for small contract wiring.

## Current lanes

1. Auth
   - login and registration handling
   - session utilities and route protection
   - safe redirect path handling
2. Mailboxes
   - mailbox listing
   - connect forms
   - mailbox ownership enforcement
   - provider status and mailbox removal
3. Providers
   - Gmail adapter
   - Outlook adapter
   - 163 IMAP adapter
4. Sync
   - manual sync actions
   - deduplication rules
   - sync log recording
5. Messages
   - inbox queries
   - provider and mailbox source display
   - verification code extraction

## Shared contract rule

If a module changes a shared shape, update the type first and note the change in the handoff summary.

## Verification rule

Each completed module must be reviewed from a clean `git status -sb` baseline, verified with the relevant tests, committed with a formal message, and pushed only after Codex has personally checked the result.
