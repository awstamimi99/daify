# M8 staging setup and release

Use the project-owned accounts below with synthetic data. Keep the $0 budget;
confirm actual account eligibility and spending controls before provisioning.
The local preparation checkpoint provisioned no infrastructure. On 2026-10-15,
the owner created the Supabase staging project recorded below; application
deployment and hosted acceptance remain pending.
See [hosting decisions](../DECISIONS/HOSTING_M8.md) and
[verification and limitations](M8_2026-10-15.md).

Historical checkpoint, superseded by the 2026-10-18 record below: [connection and credential setup](SUPABASE_CONNECTION_2026-10-17.md)
is prepared. The password is saved privately; the connection check stopped at
certificate validation and needs the project CA. Hosted authentication and role
creation remain pending. Use the step-by-step connection record
before applying any hosted migrations.

## Supabase project record — 2026-10-15

**Current checkpoint (2026-10-18):** the record below is historical. Both
restricted roles and all 15 migrations are now verified on hosted staging,
with 41 application tables and no development seed. See
[launch progress](../launch/DAIFY_LAUNCH_PROGRESS.md). Hosting account setup and
email domain configuration are deferred external dependencies at the owner's
request. Do not deploy, provision services or dispatch the release workflow yet.

Source: owner-provided dashboard screenshots and connection parameters.
These are non-secret identifiers and a connection template, not credentials.

| Setting | Recorded value |
| --- | --- |
| Organization / plan | DAIFY / Free |
| Project name | `daify-staging` |
| Project reference | `dflhhtefjqelevmhvyin` |
| Project URL | `https://dflhhtefjqelevmhvyin.supabase.co` |
| Dashboard | `https://supabase.com/dashboard/project/dflhhtefjqelevmhvyin` |
| Region | Central EU (Frankfurt), `eu-central-1` |
| Dashboard status | Healthy in the supplied screenshot |
| Dashboard SQL check | PostgreSQL `17.11`; database/user `postgres`; zero public tables; no roles matching `daify%` in the supplied 2026-10-15 result |
| Connection method | Session pooler (IPv4), URI |
| Host | `aws-1-eu-central-1.pooler.supabase.com` |
| Port | `5432` |
| Database | `postgres` |
| Initial administrator pooler username | `postgres.dflhhtefjqelevmhvyin` |
| Data API / automatic table exposure / automatic RLS | Disabled in the supplied creation settings; verify persisted settings before migrations |
| GitHub integration | No repository connected in the supplied dashboard |

Password-free connection template, exactly as supplied:

```text
postgresql://postgres.dflhhtefjqelevmhvyin:[YOUR-PASSWORD]@aws-1-eu-central-1.pooler.supabase.com:5432/postgres
```

The actual password is not recorded here. Keep it in the owner's password
manager. The username above is the initial administrator connection, not the
application's final runtime role. Separate migration/runtime roles and TLS
configuration remain to be prepared and verified.

Saving this record did not connect to the database or apply migrations. External
pooler connectivity, role permissions, private bucket/S3 keys
and object operations are not yet verified. No application environment file
was changed to point development or destructive tests at this hosted database.

## Accounts and order

1. **Supabase:** one free staging project, a private image bucket and S3 access
   keys. Disable Data API exposure of application tables. Configure distinct
   migration and runtime database roles, TLS and connection limits; prove the
   runtime role has only the required table/sequence privileges after migrations.
   Prefer the IPv4 session pooler; copy actual connection settings from the
   project. Record database/storage region and version.
2. **Resend:** a verified sender domain and a sending key. Confirm DNS ownership
   and delivery limits. Without a verified sender, hosted signup/reset/invitation
   acceptance remains blocked; do not substitute test transport on a public API.
3. **Render:** one free Node web service for this repository using `render.yaml`.
   Choose the API region alongside the database before creation. Disable
   automatic deployment. Record the service ID and HTTPS API origin. Platform
   creation may trigger an initial build; complete configuration and migrations
   before treating it as a usable staging service.
4. **Netlify:** one free project with a stable provider HTTPS hostname. Use the
   repository root as base, `apps/web` as package directory, and root
   `netlify.toml`. The publish directory is `apps/web/.next`; the adapter packages
   the app. Disable Git-triggered builds/deploy previews while retaining manual
   CLI deployment so checks cannot be bypassed. Do not enable extra paid services.
5. **GitHub:** create the `staging` Actions environment and configure the secrets
   and variables below. Check included Actions minutes and zero-spend controls.
   Leave `STAGING_DEPLOY_ENABLED` unset until the preceding setup is verified.

## Runtime settings

Set these directly in provider settings, never in chat, Git, or `NEXT_PUBLIC_*`.
Generate two independent random 32-byte base64 keys using a local password
manager or `openssl rand -base64 32`. Keep a secure backup of the MFA key.

| Location | Settings |
| --- | --- |
| Both web and API | Same `PROXY_SIGNING_KEY` and `SESSION_COOKIE_NAME=daify_session`; `NODE_ENV=production` |
| Netlify, build and functions scopes | `DAIFY_WEB_ORIGIN=https://<site>.netlify.app`, `DAIFY_API_URL=https://<api>.onrender.com`, `DAIFY_DEPLOYMENT_ENV=staging` |
| Netlify, functions scope | `PROXY_SIGNING_KEY`, `DAIFY_CLIENT_IP_HEADER=x-nf-client-connection-ip`, `SESSION_COOKIE_NAME` |
| Render | Runtime-role `DATABASE_URL`, `DATABASE_POOL_MAX=3`, `DATABASE_CONNECTION_TIMEOUT_MS=10000`, optional PEM `DATABASE_SSL_CA`, matching `WEB_ORIGIN`, independent `MFA_ENCRYPTION_KEY` |
| Render mail | `EMAIL_TRANSPORT=smtp`, `SMTP_HOST=smtp.resend.com`, `SMTP_PORT=2587`, `SMTP_SECURE=false`, `SMTP_REQUIRE_TLS=true`, `SMTP_USER=resend`, secret `SMTP_PASSWORD`, verified plain-address `EMAIL_FROM` |
| Render media | `MEDIA_STORAGE=s3`, project `S3_ENDPOINT`, actual `S3_REGION`, private `S3_BUCKET`, secret `S3_ACCESS_KEY_ID` and `S3_SECRET_ACCESS_KEY` |
| Render feature gates | `ALLOW_DEV_SEED=false`, `BILLING_MODE=disabled`, `ANALYTICS_MODE=disabled`; omit payment credentials and hosted Redis |

The proposed Netlify client-IP header is not accepted as trustworthy until live
spoofing tests pass. Verify that both functions and alternate entrypoints get an
overwritten client address, and that direct API requests remain rejected.

## GitHub configuration

| Type / location | Name | Purpose |
| --- | --- | --- |
| `staging` environment secret | `RENDER_API_KEY` | Trigger/read the selected API deployment |
| `staging` environment secret | `NETLIFY_AUTH_TOKEN` | Package/publish the selected staging project |
| `staging` environment secret | `MIGRATION_DATABASE_URL` | Dedicated migration role; never use in web runtime |
| `staging` environment secret | `STAGING_RUNTIME_DATABASE_URL` | Restricted runtime login used only for release verification |
| `staging` environment secret | `STAGING_DATABASE_CA` | Project CA certificate PEM for verified TLS on the runner |
| Repository variable | `RENDER_SERVICE_ID` | `srv-...` identifier |
| Repository variable | `NETLIFY_SITE_ID` | Existing project ID |
| Repository variable | `DAIFY_API_URL` | Canonical HTTPS API origin, no path/query |
| Repository variable | `DAIFY_WEB_ORIGIN` | Canonical HTTPS web origin, no path/query |
| Repository variable | `STAGING_DEPLOY_ENABLED` | Set to `true` only when ready for a deliberate manual staging release |

Keep the enable switch at repository scope: it is evaluated by the job-level
condition before environment secrets become available. Runtime secrets remain
in Render/Netlify; the workflow does not install them automatically.

The two release database URLs must target the recorded session pooler on port
5432, database `postgres`, with the exact role/project username and
`sslmode=verify-full`. Only `schema=public` and `connection_limit=1` are accepted
as additional parameters. Do not copy a local `sslrootcert` path into Actions:
the release script writes the supplied CA to a temporary 0600 file on that
runner and removes it afterward. Runtime/provider secrets are not passed to
the Prisma subprocess; its output is captured to avoid printing connection
details. Keep the CA and all populated URLs out of Git.

`node scripts/staging-release-database.mjs status` is a read-only check of both
actual logins, TLS, migrator defaults, Prisma history and runtime access.
`deploy` additionally runs migrations and explicit reviewed runtime grants.
Neither command creates roles, changes passwords or takes schema ownership.
These commands require secure environment injection; do not paste credentials
into shell history. They are prepared but were **not executed against Supabase
in this development checkpoint**.

The release now rejects excess runtime TRUNCATE/REFERENCES/TRIGGER/MAINTAIN
privileges and grant options, incorrect table ownership, public schema-specific
default grants, and unexpected views/sequences. The current UUID-based schema
requires no sequence privileges. Future objects require a reviewed allowlist
change; do not grant access to every object in `public`.

## Release

1. Confirm quality and browser/API checks pass on the exact reviewed commit.
   CI packages the adapter on Linux; never upload the macOS local function ZIP.
2. Back up staging database/media and record the currently working API commit
   and Netlify deploy ID. Check migrations are additive and backward-compatible.
3. From Actions, manually run **Deploy verified staging** on the reviewed branch
   or tag. Avoid new pushes to that ref during review; the workflow deploys its
   captured `github.sha`. It reruns required checks first.
4. The serialized deployment job validates settings, packages and inspects the
   web app, applies migrations once, deploys the API at the captured commit,
   verifies Render reports that same commit as live, then publishes the packaged
   web app and runs HTTP smoke checks. The `--prod` CLI flag means the staging
   site's primary URL, not customer production.
5. Record the commit, URLs, provider versions/regions and evidence. Verify hosted
   SSR and QR first because the local Netlify emulator cannot resolve the
   adapter's generated `/var/task` monorepo imports. Then test real mail, private
   media, signup/login/MFA, tenant isolation, publish/rollback/unpublish,
   English/Arabic layouts, forged ingress headers and recovery after idle.

Never infer complete release success from API readiness alone. If the web
publish or smoke step fails after the API changes, the workflow fails but does
not automatically roll back either provider or the database.

## Rollback and recovery

Database release phases commit separately: preflight, Prisma deploy, Prisma
status, explicit runtime grants (one transaction), then an independent runtime
login verification. A failed step prevents service deployment. Migration success
followed by a grant or verification failure leaves the committed schema in
place; it is not an atomic rollback of the release. Inspect migration history
and permissions before recovery. An interrupted or failed migration may require
a reviewed forward fix and deliberate Prisma resolution; never blindly mark it
applied or rerun destructive commands. Once the schema is confirmed complete,
the grant phase is repeatable for the exact allowlist. Verification failure does
not automatically revoke, broaden or repair existing privileges.

Local phase-failure tests verify that later actions never run after a failure,
no mutation is automatically retried, and raw driver/process errors are redacted.
The PostgreSQL 17 fixture also proves excess grants are detected through actual
restricted logins. A hosted release and provider rollback remain unexecuted.

Leave `STAGING_DEPLOY_ENABLED` unset/false while investigating. Capture the
failed step, release SHA and provider deploy IDs without secrets. A failed
packaging check occurs before migrations; a failed API build prevents web
publication. GitHub serializes staging workflow runs, but cannot prevent manual
provider changes or unrelated workflows; avoid those during a release.

For additive-schema releases, redeploy the last verified API commit and restore
the matching previous Netlify deployment through provider controls, then rerun
health and functional acceptance. Confirm neither provider silently rolls to a
different commit and retain the schema additions needed by both versions.

Do not automatically reverse a migration. If schema/data is incompatible with
the older app, use a reviewed forward fix or restore an encrypted database and
media backup to a clean target with the correct MFA key. Measure the restore
before claiming recovery readiness. Actual rollback/restore execution remains
an open M8 acceptance task.

## Provider references

Checked 2026-10-15: [Netlify monorepos](https://docs.netlify.com/build/configure-builds/monorepos/),
[Next.js support and middleware limitations](https://docs.netlify.com/build/frameworks/framework-setup-guides/nextjs/overview/),
[CLI deployment flags](https://cli.netlify.com/commands/deploy/),
[Render automatic deployment control](https://render.com/docs/blueprint-spec),
[Resend SMTP and verified sender requirements](https://resend.com/docs/send-with-smtp).
Account-specific free-plan quotas must still be checked at setup.
