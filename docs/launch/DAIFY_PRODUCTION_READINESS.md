# DAIFY deployment and production readiness

Updated: 2026-10-18. **Do not deploy yet.** The owner deferred hosting account
setup and email-domain configuration. This runbook prepares the next approved
release; it does not authorize it. Production launch is a separate decision.

## Prepared and locally verified

- Core bilingual owner journey, private tenant/team access, menu images,
  publishing and stable public/QR routes.
- Beta billing disabled, no payment enrollment or checkout, analytics disabled.
- API production configuration rejects test mail, local media and sandbox billing.
- Separate database logins, verified TLS and bounded pools; exact runtime table
  allowlist; role/default-ACL/ownership checks before release.
- CI quality checks, browser/API tests, offline Netlify package inspection,
  serialized manual release, exact-commit Render deployment and HTTP smoke checks.
- No service deployment follows a database preflight, migration, grant or
  verification failure. No automatic mutation retry or database rollback.

See [checkpoint evidence](../QA/BETA_DEPLOYMENT_PREPARATION_2026-10-18.md) for
commands, outcomes and the distinction between local and hosted proof.

## Pending external dependencies

| Dependency | Required evidence before hosted acceptance |
| --- | --- |
| Render and Netlify | Project-owned access, allowed free plan, auto-deploy disabled, recorded regions and stable HTTPS origins |
| Email | Verified sender, secure SMTP connection and actual verification/reset/invitation inbox delivery |
| Private object storage | Private bucket, scoped credentials, upload/read/delete and recovery through the API; anonymous object access denied |
| GitHub staging environment | Reviewed secret/variable matrix, repository access, checks on the exact release SHA |
| Operations | Named operator, alert recipient, secure backup destination, provider quota limits and accepted availability expectations |

Do not replace missing mail with a test adapter or silently verify accounts.
Do not enable billing, paid infrastructure, production DNS or public signup
promotion to overcome an external dependency. New unsubscribed Beta organizations
currently have unrestricted menu entitlements; validate resource quotas and abuse
controls before promoting open registration.

## Release gate

1. Obtain authorization to resume deployment. Confirm project
   `dflhhtefjqelevmhvyin`, region and intended staging providers.
2. Review the diff and successful CI on the exact commit. Review every pending
   migration for compatibility; future tables require explicit allowlist review.
3. Inject secrets directly into provider/environment controls using the
   [staging matrix](../QA/M8_STAGING.md). Preserve the MFA encryption key.
   Use the runtime DB role only in the API; no database credentials in web bundles.
4. Record the existing API commit and web deployment ID. Take verified backups
   and confirm an older application can tolerate the proposed schema additions.
5. Run the prepared serialized release workflow. Keep billing/analytics disabled,
   development seed off, Data API exposure disabled and private storage private.
6. Verify deployed SSR, QR/native images, both languages on mobile, signup/email,
   login/logout/reset/MFA, team invitations, publishing and cross-tenant denials.
7. Verify trusted client headers are overwritten, forged/direct API requests
   fail, cookies are secure, CSRF/CORS reject foreign origins, private responses
   are not cached and staging is noindex. Test API recovery after idle.
8. Record evidence and decide whether hosted Beta acceptance has passed. Do not
   infer production readiness from a healthy endpoint or a successful build.

## Backup and restore procedure

Use a secure operator environment and certificate-verified database connections.
Never put full URLs/passwords in commands, console output or shell history.
Backups contain personal information and encrypted MFA secrets; restrict access.

- Export `public` using PostgreSQL 17 `pg_dump` custom format with `--no-owner`
  and `--no-acl`. This includes Prisma history, constraints, indexes and functions.
  Do not export or restore Supabase-managed schemas as application objects.
- Encrypt the export with an authenticated encryption tool approved for the
  backup destination. Store encryption keys separately. Verify a checksum,
  authenticated decryption and retention policy; securely remove temporary files.
- Independently snapshot the private image bucket with object keys and hashes.
  Capture a consistent database/media point or pause writes; a DB dump alone
  cannot recover published images. Back up the stable MFA key separately.
- Restore first to a **clean, explicitly approved target**, using a restricted
  migrator. Do not overwrite a live schema or use `--clean` on hosted data.
- Preserve the provider-owned `public` schema. Review `pg_restore --list`, omit
  the `SCHEMA - public` entry and its `COMMENT - SCHEMA public` entry, and restore
  with `--use-list`, `--no-owner`, `--no-acl` and `--exit-on-error`. Do not change
  schema ownership to avoid a permission error. Check that no additional managed
  objects occur in the archive before executing it.
- Apply reviewed runtime grants and verify both roles/defaults, ownership,
  migration history, FK/index counts, row manifests and private media hashes.
  Verify application login, MFA, tenant isolation and published image routes
  using the restored environment before routing traffic.
- Record actual elapsed recovery time and snapshot age. Set RTO/RPO only after
  a realistic hosted drill; small local fixture timings are not service guarantees.

Local rehearsal restored 41 tables / 15 migration records / 94 synthetic rows
with exact per-table data hashes and independent runtime verification. AES-GCM
backup integrity checks rejected a modified authentication tag. Forty-two local
JPEG fixtures round-tripped encryption/decryption byte-for-byte. This did not
restore a hosted bucket, send email, exercise restored MFA login, or prove a
production recovery objective. The local drill took approximately 0.27 seconds.

## Failure and rollback

Preflight failure: stop; fix the configuration or review unexpected privileges
without broadening them. A script error never authorizes changing ownership,
resetting a password, or granting superuser privileges.

Migration failure: preserve evidence and inspect migration history/objects
securely. Prisma and later grant/verification phases are separate transactions.
A schema change may already be committed when a later phase fails. Do not reset
the schema, automatically reverse SQL or mark a failed migration applied. Use a
reviewed forward fix or clean-target restore, then rerun explicit verification.

API/web failure after migration: keep the prior working web/API versions where
possible. For compatible additive migrations, redeploy the recorded API commit
and restore the matching previous Netlify deployment. Keep compatible schema
additions. If data/schema is incompatible, use a reviewed forward fix or the
verified clean-target restore. Confirm provider commit IDs and rerun smoke tests.

## Monitoring and incidents

Before external Beta, assign the owner/operator and an actual alert recipient.
Monitor API readiness with database check, error rates/latency, database pool
exhaustion, private media failures, SMTP failures and notification backlog.
Record provider request/deploy IDs and application event IDs; never log tokens,
cookies, passwords, connection URLs or full customer records.

For auth or tenant-isolation incidents, stop affected traffic/deployments,
preserve redacted evidence, revoke affected sessions through application controls,
and assess exposure before reopening. Rotate compromised credentials through the
provider secret store and verify both old-secret rejection and service recovery.
The previously shared administrator password still needs owner-controlled rotation;
it is not an application runtime credential and was not rotated in this checkpoint.

For quota exhaustion/provider pause, keep data intact, notify the operator and
restore service deliberately. Do not automatically upgrade to a paid plan or use
keepalive traffic to evade provider restrictions. Public menus depend on these
providers' availability; define acceptable uptime before commercial launch.

## Commercial launch remains separate

Live payment/webhook lifecycle, recurring renewal/failure, cancellation/refunds,
activation of approved offers, production domains, legal review, retention,
monitoring/alerts, realistic restore testing and final public-launch approval
remain outside the no-charge Beta checkpoint.
