# Agent Workstreams

This is no longer the primary development entry point.

All new AI and human coding windows must start with `docs/development-handbook.md`, then read `docs/implementation-roadmap.md` and `docs/project-structure-snapshot.md`.

## Ownership Model

Codex owns final integration and verification. A workstream should have one primary worker at a time. Cross-module edits are allowed only for small, explicit contract wiring.

No workstream may implement directly on `main`. Create a feature branch or a separate `git worktree` branch before editing tracked files.

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
- Do not let two windows share the same branch unless one is explicitly reviewing only.
- Prefer one worktree per active implementation window.
- If a shared type or helper changes, update callers and tests in the same module.
- If a task crosses Auth, Providers, Messages, and UI, split it into smaller commits.
- If a window uses a worktree, the handoff must include path, branch, commits, tests, and merge expectations.
- A worker may choose subagents or an agent team for research, review, or implementation support when useful.
- The primary worker still owns final diff review, tests, and handoff accuracy.

## Branch Naming

Use prefixes that match intent:

- `ui/...`
- `docs/...`
- `fix/...`
- `feat/...`
- `test/...`
- `refactor/...`

Examples:

- `ui/chinese-app-shell`
- `ui/awwwards-inbox-reader`
- `docs/multi-window-flow`
- `fix/message-delete-ownership`

## Merge Discipline

- Only the user-designated merge window merges branches into `main`.
- A worker branch should be clean and committed before handoff.
- The merge window must inspect the branch diff and rerun verification.
- Push only after Codex main control and user approval.

## Verification Rule

Each completed module must be reviewed from a known `git status -sb` baseline, verified with relevant tests, committed with a formal message, merged only by the designated merge window, and pushed only after Codex main control personally checks the result.
