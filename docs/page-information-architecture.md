# Glimmail Page Information Architecture

This document defines the target page structure for the redesign. Implementers must update existing project files where possible and remove obsolete UI files only when they are no longer referenced.

## Page Strategy

Glimmail must have both a public/home entry and an authenticated app workspace.

Target routes:

- `/`: Home page.
- `/login`: Login page.
- `/register`: First-owner registration page.
- `/inbox`: Authenticated unified inbox workspace.
- `/mailboxes`: Authenticated connected-account management.
- `/mailboxes/connect`: Authenticated mailbox connection flow.
- `/settings`: Authenticated settings workspace.

Do not keep a root route that only redirects to `/login` as the final design. It is acceptable during migration, but the target product needs a real home page.

## Home Page

Purpose:

- Introduce Glimmail in Chinese.
- Explain the value of a unified inbox.
- Provide primary entry to login.
- If the user is already authenticated, route or link them to `/inbox`.

Required content:

- Product name: `Glimmail`.
- One concrete Chinese value statement.
- Provider support: Gmail, Outlook, 163 Mail.
- Safety statement: encrypted credentials and safe sync summaries.
- Primary action: `登录`.
- Secondary action for empty local deployments: `创建首个账号` when registration is available.

Style:

- Use the Awwwards-inspired direction from `docs/awwwards-design-system.md`.
- It may be visually richer than app pages, but must not become a marketing-only landing page.
- The first viewport should still make the product and login action obvious.

## Login Page

Purpose:

- Let existing users sign in quickly.
- Preserve safe `next` redirect handling.

Required behavior:

- If already authenticated, redirect to `/inbox`.
- Keep hidden `next` value sanitized through `getSafeNextPath`.
- Show safe invalid-credentials copy.
- Do not add fake auth providers unless implemented.

Required copy:

- Product name: `Glimmail`.
- Chinese form labels.
- Chinese error text.
- Primary action: `登录`.
- Registration link only when first-owner registration is relevant.

Style:

- Replace the old AetherMail glass/neon presentation.
- Use the same dark shell and content-island language as the design baseline.
- Avoid decorative controls that do not work, such as a non-functional theme toggle.

## Register Page

Purpose:

- Bootstrap the first owner in local or self-hosted deployments.

Rules:

- Keep first-user-only registration behavior unless product requirements change.
- Copy must clearly state that registration closes after the first account unless explicitly enabled.
- Do not expose environment values.

## Inbox Page

Purpose:

- Main authenticated workspace.

Required layout:

- Fixed left Rail.
- Split Inbox message list with independent scroll.
- Reader pane with independent scroll.
- Context stack when viewport allows.

Required actions:

- Star.
- Mark read or unread.
- Archive entry point.
- Delete entry point.
- More actions.

Rules:

- Delete must be directly visible, not only inside `More`.
- Provider source must be visible on each message.
- Verification code module must remain prominent and copyable.

## Mailboxes Page

Purpose:

- Manage connected providers and sync authorization.

Target structure:

- Use an account list or table instead of large marketing cards.
- Show provider, mailbox address, connection status, sync authorization, recent sync, and actions.

Required actions:

- Connect account.
- Test connection.
- Sync now when authorized.
- Authorize or re-authorize sync when needed.
- Remove mailbox.

Rules:

- Disabled sync states must explain the missing permission in Chinese.
- Do not expose tokens, raw provider errors, or raw OAuth response bodies.

## Connect Mailbox Flow

Preferred route:

- Keep `/mailboxes/connect?provider=gmail|outlook|mail163` for now.

Reason:

- The existing app already has this route and provider validation.
- It keeps OAuth callback and return paths simple.
- It avoids unnecessary routing churn during the redesign.

Target UX:

- The `/mailboxes` page should be the hub.
- `Connect account` opens or links to `/mailboxes/connect`.
- `/mailboxes/connect` renders a focused provider-specific flow:
  - Provider identity.
  - Required permission explanation.
  - Safe setup warning if env config is missing.
  - Provider-specific connect button or 163 authorization-code form.

Future option:

- A modal or side panel may be added later, but only after the dedicated page is redesigned and stable.

## Settings Page

Purpose:

- Account and application settings.

Required sections:

- Account profile.
- Connected mailbox summary.
- Sync and security.
- Authorization management.
- Interface preferences when implemented.
- Danger section with logout.

Rules:

- Logout must not be the only primary content on the page.
- Do not add non-functional settings toggles.

## Cleanup Rules

When implementing the redesign:

- Modify existing pages and components where they remain valid.
- Delete obsolete components, CSS classes, and mock data only after confirming they are unreferenced.
- Remove old `AetherMail` naming from user-facing UI.
- Remove old purple neon/glass classes once no longer referenced.
- Do not delete provider docs, OAuth docs, runbooks, tests, or Prisma migrations as part of UI cleanup.

Use `rg` before deleting:

```powershell
rg -n "symbol-or-file-name" src docs README.md
```

Run `git status -sb` and inspect `git diff` before committing cleanup.

