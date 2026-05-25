# Glimmail Implementation Roadmap

Update checkboxes as modules are completed and verified. Each completed module needs a commit and a handoff summary.

## Phase 0 Documentation Baseline

- [x] Add enterprise development handbook.
- [x] Add Awwwards design system.
- [x] Add project structure snapshot.
- [x] Add implementation roadmap.
- [x] Update README docs entry.
- [x] Include `design-preview-zh.html` as the visual baseline.

Acceptance:

- New windows can start from `docs/development-handbook.md`.
- README points to the new docs.
- Secret scan is clean except safety-rule references.

Suggested checks:

```powershell
git status -sb
rg -n "access_token|refresh_token|authorization code|client_secret|client secret|Bearer|oauth_access_token|oauth_refresh_token|app password|ENCRYPTION_KEY" README.md docs design-preview-zh.html
pnpm lint
pnpm typecheck
```

## Phase 1 Chinese UX Copy

- [ ] Create a dedicated branch or worktree branch before editing UI copy.
- [ ] Read `docs/page-information-architecture.md`.
- [ ] Replace user-facing `AetherMail` naming with `Glimmail`.
- [ ] App shell copy.
- [ ] Inbox copy.
- [ ] Mailboxes copy.
- [ ] Settings copy.
- [ ] Login, register, and connect copy.
- [ ] Error, empty, loading, and success states.

Acceptance:

- UI is Chinese-first.
- Provider names and protocol names remain accurate.
- No secret values are exposed in copy.

## Phase 2 Design System Foundation

- [ ] Create a dedicated branch or worktree branch before editing design system code.
- [ ] Preserve the page structure defined in `docs/page-information-architecture.md`.
- [ ] Replace old glass/neon globals.
- [ ] Define color tokens from `docs/awwwards-design-system.md`.
- [ ] Define button styles.
- [ ] Define badge and chip styles.
- [ ] Define loading skeleton and sync breathing dot.
- [ ] Define reduced-motion behavior.
- [ ] Decide whether production needs `lenis` and `gsap` dependencies.

Acceptance:

- No return to the old purple neon glass style.
- Motion respects `prefers-reduced-motion`.
- Production code does not use CDN scripts.

## Phase 3 App Shell

- [ ] Create a dedicated branch or worktree branch before editing shell files.
- [ ] Rail navigation.
- [ ] Active route states.
- [ ] Account summary.
- [ ] Mobile fallback.
- [ ] Settings and accounts entry points.

Acceptance:

- Navigation remains usable on desktop and mobile.
- User can reach inbox, accounts, and settings.

## Phase 4 Inbox Redesign

- [ ] Create a dedicated branch or worktree branch before editing inbox files.
- [ ] Split inbox layout.
- [ ] Account filters.
- [ ] Mail list source badges.
- [ ] Reader toolbar.
- [ ] Verification code module.
- [ ] Independent scroll panes.
- [ ] Delete and archive UI entry points.
- [ ] Loading and empty states.

Acceptance:

- Delete and archive are visible where expected.
- Message source is clear.
- Reader remains comfortable for long content.

## Phase 5 Accounts And Settings

- [ ] Create a dedicated branch or worktree branch before editing account/settings files.
- [ ] Accounts list or table.
- [ ] Provider status.
- [ ] Sync authorization states.
- [ ] Recent activity.
- [ ] Settings sections.
- [ ] Logout in danger section.

Acceptance:

- Gmail, Outlook, and 163 states are understandable in Chinese.
- Disabled sync states tell the user what authorization is missing.

## Phase 6 Real Mail Actions

- [ ] Create a dedicated branch or worktree branch before editing message mutation code.
- [ ] Archive action.
- [ ] Delete action.
- [ ] User isolation tests.
- [ ] Safe success and error messages.
- [ ] No raw provider body or secret logging.

Acceptance:

- Mutations require `userId` ownership.
- Tests prove one user cannot mutate another user's messages.
- Sync logs remain safe summaries.

## Phase 7 Production Hardening

- [ ] Real-provider smoke tests.
- [ ] OAuth production checklist.
- [ ] Secret rotation checklist.
- [ ] HTTPS redirect URI verification.
- [ ] Privacy and terms readiness.

Acceptance:

- `docs/operator-runbook.md`, `docs/oauth-production-checklist.md`, and `docs/real-sync-smoke-test.md` have been followed.

## Phase 8 Home, Login, And Connect UX

- [ ] Create a dedicated branch or worktree branch before editing route files.
- [ ] Implement `/` as a real Chinese home page instead of a final redirect-only route.
- [ ] Redesign `/login` with Glimmail branding and safe Chinese auth copy.
- [ ] Keep `/register` as first-owner bootstrap and clarify its purpose in Chinese.
- [ ] Keep `/mailboxes/connect?provider=...` as the focused provider connection page for now.
- [ ] Redesign mailbox connect states for Gmail, Outlook, and 163 Mail.
- [ ] Remove obsolete AetherMail/glass/neon assets after proving they are unreferenced.

Acceptance:

- Public users can understand the product from `/`.
- Existing users can sign in from `/login`.
- Authenticated users still reach `/inbox`.
- Provider connection remains safe and does not expose secrets.
