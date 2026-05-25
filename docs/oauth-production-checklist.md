# OAuth Production Checklist

Use this checklist before moving Gmail or Outlook sync from local testing to production. It consolidates provider setup, security, and release checks so production OAuth details do not live only in implementation plans.

## Gmail

- [ ] Configure the Google Cloud OAuth consent screen with production app name, support email, developer contact email, authorized domains, privacy policy, terms, and app logo.
- [ ] Decide whether the app remains in Testing or is published to Production. Testing mode is limited to configured test users; Production requires verification for sensitive or restricted scopes.
- [ ] Include only implemented scopes. Glimmail currently needs `openid email profile` for account connection and `https://www.googleapis.com/auth/gmail.readonly` for sync authorization.
- [ ] Treat `gmail.readonly` as a restricted Gmail scope. Plan for Google OAuth app verification and possible third-party security assessment if restricted scope data is stored or transmitted by the server.
- [ ] Register the exact production redirect URI in Google Cloud:

  ```text
  https://<domain>/api/auth/gmail/callback
  ```

- [ ] Keep local and production OAuth clients separate when possible.
- [ ] Rotate `GOOGLE_CLIENT_SECRET` before production launch and immediately after any suspected exposure.
- [ ] Verify the production domain used by homepage, privacy policy, terms, and redirect URIs.
- [ ] Confirm the consent screen copy clearly explains that Glimmail reads recent inbox messages for unified inbox display and verification-code extraction.

## Outlook / Microsoft

- [ ] Confirm the Azure App Registration supported account type matches the launch target:
  - Single tenant for one organization only.
  - Multitenant for work/school accounts across organizations.
  - Work/school plus personal Microsoft accounts if Outlook.com, Hotmail, or Live accounts must work.
- [ ] Register the exact production redirect URI under the Web platform:

  ```text
  https://<domain>/api/auth/outlook/callback
  ```

- [ ] Confirm the app uses the Microsoft identity platform v2 authorization code flow for a confidential web app.
- [ ] Track `MICROSOFT_CLIENT_SECRET` expiration and rotate before expiry. Rotate immediately after any suspected exposure.
- [ ] Confirm whether the release supports personal Microsoft accounts, work/school accounts, or both. Test at least one account from each supported category.
- [ ] Document tenant admin consent risk. Some organizations block user consent by policy even when `Mail.Read` delegated permission does not require admin consent by default.
- [ ] Confirm Microsoft Graph delegated permissions:
  - `openid profile email offline_access User.Read` for account connection.
  - `Mail.Read` for mailbox sync.
- [ ] Do not request `Mail.ReadWrite`, `Mail.Send`, or application permissions for the current read-only sync flow.

## Shared Security and Release Checks

- [ ] `.env.local` is not committed and is not printed in logs, screenshots, chat, issues, or release notes.
- [ ] Production traffic uses HTTPS.
- [ ] OAuth authorization codes, access tokens, refresh tokens, client secrets, app passwords, and encrypted credential values are not exposed in logs, URLs, UI, `SyncLog.message`, screenshots, or docs.
- [ ] If any secret, token, or authorization code is exposed, rotate the affected secret or revoke the affected grant before continuing.
- [ ] `SyncLog.message` contains only safe summaries and actionable prompts.
- [ ] Run a real sync smoke test for 163 Mail, Gmail, and Outlook before release.
- [ ] Confirm duplicate Sync Now runs do not import duplicate messages.
- [ ] Confirm inbox previews do not render raw HTML.
- [ ] Confirm verification-code extraction still works for test messages that contain a code.

## Official References

- [Google Identity: OAuth 2.0 for Web Server Applications](https://developers.google.com/identity/protocols/oauth2/web-server)
- [Gmail API: Choose Scopes](https://developers.google.com/workspace/gmail/api/auth/scopes)
- [Google Cloud: OAuth App Verification](https://support.google.com/cloud/answer/13463073)
- [Google Cloud: Manage App Audience](https://support.google.com/cloud/answer/15549945)
- [Microsoft identity platform: Authorization code flow](https://learn.microsoft.com/en-us/entra/identity-platform/v2-oauth2-auth-code-flow)
- [Microsoft identity platform: Supported account types](https://learn.microsoft.com/en-us/entra/identity-platform/v2-supported-account-types)
- [Microsoft identity platform: Redirect URI restrictions](https://learn.microsoft.com/en-us/entra/identity-platform/reply-url)
- [Microsoft identity platform: Add app credentials](https://learn.microsoft.com/en-us/entra/identity-platform/how-to-add-credentials)
- [Microsoft Graph permissions reference](https://learn.microsoft.com/en-us/graph/permissions-reference)
