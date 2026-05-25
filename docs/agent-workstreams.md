# Agent Workstreams

This is no longer the primary development entry point.

All new AI and human coding windows must start with `docs/development-handbook.md`, then read `docs/implementation-roadmap.md` and `docs/project-structure-snapshot.md`.

## Ownership Model

Codex owns final integration and verification. A workstream should have one primary worker at a time. Cross-module edits are allowed only for small, explicit contract wiring.

## Workstream Lanes

- Auth: login, registration, sessions, route protection, safe redirect paths.
- Mailboxes: mailbox dashboard, connect flows, mailbox ownership, provider status, removal.
- Providers: Gmail, Outlook, 163 Mail adapters, parsing, rate limits, provider docs.
- Sync: manual sync actions, deduplication, safe sync log recording.
- Messages: inbox queries, message display shaping, verification code extraction.
- UI Redesign: Awwwards design system, Chinese UX copy, app shell, inbox, accounts, settings.
- Docs: handbook, roadmap, architecture, runbooks, OAuth checklists.

## Conflict Rules

- Do not let two windows edit the same file family.
- If a shared type or helper changes, update callers and tests in the same module.
- If a task crosses Auth, Providers, Messages, and UI, split it into smaller commits.
- If a window uses a worktree, the handoff must include path, branch, commits, tests, and merge expectations.

## Verification Rule

Each completed module must be reviewed from a known `git status -sb` baseline, verified with relevant tests, committed with a formal message, and pushed only after Codex main control personally checks the result.
