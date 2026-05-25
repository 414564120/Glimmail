# Glimmail Development Handbook

This is the first document every new AI or human coding window must read before changing the project.

## Mission

Glimmail is a Chinese-first, multi-user unified inbox for Gmail, Outlook, and 163 Mail. The product must keep enterprise-grade safety boundaries while staying simple enough to deploy on a single VPS.

Current product capabilities:

- Next.js App Router with TypeScript and Tailwind.
- PostgreSQL and Prisma 7.
- Database-backed auth, first-owner registration, login, logout, and protected pages.
- User-isolated mailboxes, credentials, messages, and sync logs.
- Gmail, Outlook, and 163 Mail account connection.
- AES-256-GCM encrypted mailbox credentials.
- Manual sync only, latest 10 INBOX messages per provider.
- No background sync and no attachments.
- Safe `SyncLog.message` summaries only.

## Mandatory First Commands

Every new window must start with:

```powershell
cd F:\code\Glimmail
git status -sb
git log --oneline -10
```

If the result does not match the expected handoff state, stop and report it before editing.

## Mandatory Reading Order

1. `docs/development-handbook.md`
2. `docs/implementation-roadmap.md`
3. `docs/project-structure-snapshot.md`
4. `docs/awwwards-design-system.md` for UI work
5. Provider-specific docs when working on Gmail, Outlook, 163 Mail, OAuth, Graph, or real sync
6. `design-preview-zh.html` when working on the Awwwards-inspired UI

## Non-Negotiable Safety Rules

- Operate only inside `F:\code\Glimmail` unless the user explicitly gives another path.
- Do not push. Codex main control pushes only after personal verification and user approval.
- Do not modify or commit `.env.local`.
- Do not modify or commit `AGENT.md` or `AGENTS.md`.
- Do not print, paste, log, screenshot, document, or expose tokens, authorization codes, refresh tokens, access tokens, client secrets, app passwords, encrypted credentials, database passwords, or encryption keys.
- Do not put secrets in URLs, logs, `SyncLog.message`, UI, screenshots, issues, README, or docs.
- Do not log raw upstream OAuth, Gmail, Microsoft Graph, or IMAP error bodies if they can contain sensitive data.
- If a secret is exposed, stop and report that it must be rotated before production use.
- If Google, Microsoft, Microsoft Graph, Gmail API, OAuth, IMAP, or provider behavior is uncertain, do not guess. Use official documentation or explicitly report the uncertainty.

## Enterprise Development Flow

Use this flow for every module:

1. Confirm state with `git status -sb` and `git log --oneline -10`.
2. Read the relevant docs and existing code before planning.
3. Define a small, verifiable task boundary.
4. Inspect immediate callers, shared utilities, tests, and types before editing.
5. Implement the smallest change that satisfies the task.
6. Avoid speculative abstractions and unrelated cleanup.
7. Run targeted tests first, then broader checks when the surface area is shared or user-facing.
8. Review your own diff before committing.
9. Commit one coherent module at a time.
10. Report exact verification results and remaining risk.
11. Wait for Codex main control or the user before push.

## Git Rules

Commit messages must use formal prefixes:

- `feat: ...`
- `fix: ...`
- `docs: ...`
- `refactor: ...`
- `test: ...`
- `chore: ...`

Rules:

- Do not create new `claude:` commits.
- Do not rewrite pushed history unless the user explicitly requests a force rewrite.
- One feature, fix, or documentation module per commit.
- Never commit `.env.local`, `AGENT.md`, `AGENTS.md`, local logs, build output, or dependency directories.
- Before commit, run `git status -sb` and inspect `git diff`.

## Multi-Window And Agent Rules

- One window owns one module at a time.
- Avoid two windows editing the same file family.
- If parallel work is needed, prefer `git worktree` with a clear path and branch name, for example:
  - Worktree: `F:\code\Glimmail-ui-redesign`
  - Branch: `ui/awwwards-inbox-shell`
- Each window must write a handoff summary with files changed, tests run, commit hash, and risks.
- Subagents or agent teams may help with review, research, or implementation, but the main worker must personally inspect the result.
- Codex main control performs final integration verification before push.

## Verification Commands

Baseline commands:

```powershell
pnpm prisma:generate
pnpm lint
pnpm typecheck
pnpm build
```

Provider and module tests:

```powershell
pnpm exec tsx src\modules\providers\mail163.test.ts
pnpm exec tsx src\modules\providers\gmail.test.ts
pnpm exec tsx src\modules\providers\outlook.test.ts
pnpm exec tsx src\modules\auth\next-path.test.ts
pnpm exec tsx src\modules\messages\sync-summary.test.ts
pnpm exec tsx src\modules\mailboxes\return-path.test.ts
```

Use judgment:

- Documentation-only work must at least pass security grep and git diff review. Run `pnpm lint` and `pnpm typecheck` when practical.
- UI work must run `pnpm lint`, `pnpm typecheck`, `pnpm build`, and browser verification.
- Provider, OAuth, Graph, Gmail, or IMAP work must run the related provider tests and consult official docs when unsure.
- Database schema changes require explicit user approval and a Prisma migration.

## Security Grep

Run this before committing docs or UI that mention auth or provider flows:

```powershell
rg -n "access_token|refresh_token|authorization code|client_secret|client secret|Bearer|oauth_access_token|oauth_refresh_token|app password|ENCRYPTION_KEY" README.md docs design-preview-zh.html
```

Matches inside safety rules are acceptable. Real secret values are not acceptable.

## UI Development Rules

- The current visual baseline is `design-preview-zh.html`.
- The design system is `docs/awwwards-design-system.md`.
- UI copy must be Chinese-first unless a provider brand or protocol name requires English.
- Do not reintroduce the old purple neon glass style.
- Do not use CDN scripts in production Next.js code. Check `package.json` first and add proper dependencies only when the implementation task calls for it.
- Respect `prefers-reduced-motion`.
- Mobile must degrade gracefully and remain usable.

## Handoff Template

Use this format at the end of a module:

```text
Summary:
- ...

Changed files:
- ...

Verification:
- command: result

Security:
- secret scan result
- forbidden files status

Risk:
- ...

Commit:
- <hash> <message>

Recommendation:
- ready for Codex main-control review
- push only after Codex/user approval
```

