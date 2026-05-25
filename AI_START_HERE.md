# AI Start Here

Before making any change in this repository, read:

1. `docs/development-handbook.md`
2. `docs/implementation-roadmap.md`
3. `docs/project-structure-snapshot.md`
4. `docs/page-information-architecture.md` for page or UX structure work
5. `docs/awwwards-design-system.md` for UI work

Then run:

```powershell
cd F:\code\Glimmail
git status -sb
git log --oneline -10
```

Do not develop directly on `main`. Before editing tracked files, create a dedicated branch or a separate `git worktree` branch as described in `docs/development-handbook.md`.

Do not guess when provider, OAuth, Microsoft Graph, Gmail, or IMAP behavior is uncertain. Use official documentation or report the uncertainty before editing.

Do not print, paste, log, document, or expose secrets, tokens, authorization codes, app passwords, encrypted credentials, or local environment values.
