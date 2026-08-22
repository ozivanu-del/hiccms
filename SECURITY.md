# Security Policy

## Reporting a vulnerability

Do not open a public issue containing credentials, tokens, personal data, or exploit
details. Contact the repository owner privately and include the affected component,
impact, reproduction steps, and suggested mitigation.

## Secrets and credentials

- Store production secrets with Cloudflare Worker Secrets, never in Git, D1 settings,
  browser code, build logs, screenshots, or documentation.
- Keep local values in `.dev.vars` or ignored `.env.*` files.
- Treat any value committed to Git as compromised, even after the file is deleted.
- Rotate a leaked value at its provider before cleaning the repository.
- Never publish default production passwords.

Expected Worker Secrets include `JWT_SECRET` and only the provider keys enabled by the
installation, such as `JWT_SECRET` or `RESEND_API_KEY`.
Use `.env.example` only as a list of supported variable names. Never place production
values in that file.

## Abuse protection

- Login attempts are limited independently by hashed IP address and hashed email.
- AI generation, provider tests, bulk drafts, regeneration, and queue execution are
  limited per authenticated user.
- Password reset requests are limited by hashed IP address and hashed email and always
  return a neutral response to prevent account enumeration.
- Rate-limit identifiers never store raw email addresses, IP addresses, tokens, or API
  keys. Expired counters are removed by the scheduled Worker.
- Password-reset delivery events are written to `security_audit_logs`. The audit stores
  provider status and message ID, but never the recipient email or reset token.

## New installation

Migration `0022_disable_known_admin_credential.sql` disables the legacy bootstrap
credential when it is still present. Configure a private administrator password through
the controlled password reset/bootstrap procedure before exposing an installation to the
internet.

## Before publishing

1. Scan the current tree and Git history for credentials.
2. Verify `.env`, `.dev.vars`, private keys, and provider configuration are ignored.
3. Confirm production uses `ENVIRONMENT=production` and a random `JWT_SECRET`.
4. Build API, Admin, and Web.
5. Review the staged diff before committing.
