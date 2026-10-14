# M8 hosting — $0 staging decision

Status: Selected for implementation; account and deployment acceptance pending.
Decision date: 2026-09-30. Budget: $0/month, as specified by the owner.

## Scope

Keep local development and the verified PostgreSQL/Redis test setup available.
Build one small external staging demo using synthetic restaurant data. This
checkpoint selects providers and the execution sequence; it does not provision
accounts, deploy the application or declare production readiness.

## Selected services

| Component | Initial selection | Constraint / acceptance |
| --- | --- | --- |
| Next.js web | Netlify Free, provider subdomain | 300 monthly credits; projects pause when exhausted. Verify exact Next.js 16.3.3 adapter build, server routes, native dependencies and trusted client IP. |
| NestJS API | One Render Free web service | Sleeps after 15 idle minutes; startup can take about a minute. Ephemeral disk requires external media storage. Shared allowance: 750 instance-hours/month. |
| PostgreSQL | One Supabase Free project | 500 MB database; record actual PostgreSQL version, region and connection limits before migrations. |
| Private images | Supabase Storage S3 API in that project | 1 GB storage and 5 GB project egress allowance; validate private Put/Get/Delete through the existing API. |
| Transactional email | Resend Free, conditional on sender setup | Published daily limit: 100. Confirm monthly quota in the account; disable transactional overages. A verified sender domain is required for normal delivery. |
| Redis / analytics | Local development and CI only initially | Hosted analytics remains disabled; no hosted Redis or separate worker in the initial demo. |
| DNS / TLS | Provider HTTPS subdomains | No purchased domain. Use an existing domain only after ownership and DNS access are confirmed. |
| CI / operations | Existing GitHub Actions and local tools | Check repository eligibility, included CI minutes and spending settings. Initial backups and restore drills are manual. |

Sources checked on the decision date: [Netlify credits](https://docs.netlify.com/manage/accounts-and-billing/billing/billing-for-credit-based-plans/how-credits-work/),
[Next.js support](https://docs.netlify.com/build/frameworks/framework-setup-guides/nextjs/overview/),
[Render Free](https://render.com/docs/free),
[Supabase allowances](https://supabase.com/docs/guides/platform/billing-on-supabase),
[Resend pricing](https://resend.com/pricing).
Account eligibility and terms must be rechecked at provisioning.

## Why the prior hosting direction changes

Vercel Hobby restricts use to personal, noncommercial projects, so it is not the
selected free host for DAIFY. This supersedes the earlier Vercel choice for
staging only. Paid production hosting remains undecided.
[Vercel Hobby terms](https://vercel.com/docs/plans/hobby).

Do not use Render Free PostgreSQL for retained staging data: it expires after
30 days. Render may also suspend free services for unusually high outgoing
traffic, including external database/storage access; this makes the proposed
combination suitable only for a small acceptance demo until measured.
[Render restrictions](https://render.com/docs/free).

Supabase may pause a low-activity free project after seven days. Free staging is
therefore not an always-available customer service.
[Supabase pausing](https://supabase.com/docs/guides/platform/free-project-pausing).

## Integration decisions to validate

- Keep DAIFY authentication and Prisma. Supabase supplies PostgreSQL and storage,
  not a replacement identity system. Use a dedicated application role, separate
  migration credentials, TLS and bounded connection pools. Start with the IPv4
  session pooler on port 5432; prove all existing migrations and transaction
  behavior. Disable Data API exposure of application tables before adding data.
  [Prisma connection guidance](https://supabase.com/docs/guides/database/prisma).
- Keep the image bucket private. Supabase S3 access keys bypass RLS across all
  buckets, so isolate this staging project and keep credentials only in the API
  secret store. Tenant checks stay in DAIFY. Copy the endpoint and region from
  the project rather than using the existing `auto` region default.
  [S3 authentication](https://supabase.com/docs/guides/storage/s3/authentication).
- Validate Netlify's Next adapter against this repository, including `proxy.ts`,
  SSR, server-only HMAC signing and QR generation. The candidate ingress header
  is `x-nf-client-connection-ip`; provider guidance identifies it as the client
  address, but a deployed spoofing test is still required before trusting it.
  Test alternate hostnames and direct function access too. Never trust arbitrary
  browser-supplied forwarding headers.
  [Netlify ingress guidance](https://answers.netlify.com/t/upcoming-change-stripping-exposed-netlify-headers-from-function-and-proxy-requests/52665).
- Render blocks SMTP ports 25, 465 and 587. Resend documents STARTTLS on 2587;
  select that port with TLS required, then run a real connection/delivery probe.
  If unavailable, implement and test an HTTPS mail adapter. A missing sender
  domain is an external acceptance dependency, not grounds to bypass email
  verification or use test mail transport on the public deployment.
  [Resend SMTP](https://resend.com/docs/send-with-smtp).
- The current web-to-API timeout is 15 seconds. Cold starts can exceed it. Provide
  a clear retry state and verify recovery after idle; never automatically replay
  a mutation. Embedded security-notification processing stops while the API
  sleeps, so alert delivery can be delayed. Do not use artificial keepalive
  traffic to evade free-tier restrictions.

## Configuration boundary

| Location | Required configuration |
| --- | --- |
| Both servers | `NODE_ENV=production`; matching `SESSION_COOKIE_NAME`; matching, dedicated `PROXY_SIGNING_KEY` |
| Web only | `DAIFY_API_URL`, canonical HTTPS `DAIFY_WEB_ORIGIN`, verified `DAIFY_CLIENT_IP_HEADER` |
| API only | `DATABASE_URL`, matching HTTPS `WEB_ORIGIN`, stable backed-up `MFA_ENCRYPTION_KEY`, `ALLOW_DEV_SEED=false` |
| API mail | `EMAIL_TRANSPORT=smtp`, `SMTP_HOST=smtp.resend.com`, `SMTP_PORT=2587`, `SMTP_SECURE=false`, `SMTP_REQUIRE_TLS=true`, `SMTP_USER=resend`, secret `SMTP_PASSWORD`, verified `EMAIL_FROM` |
| API media | `MEDIA_STORAGE=s3`, project-specific `S3_ENDPOINT`, `S3_REGION`, `S3_BUCKET`, secret `S3_ACCESS_KEY_ID` and `S3_SECRET_ACCESS_KEY` |
| API initial feature state | `BILLING_MODE=disabled`, `ANALYTICS_MODE=disabled`; omit MyFatoorah credentials and analytics Redis URL |

These are configuration requirements, not a populated environment file. Never
place secrets in `NEXT_PUBLIC_*`, source control, browser bundles or build logs.
Existing production validation intentionally rejects sandbox billing and local
analytics. Later hosted sandbox acceptance needs an explicit environment/feature
separation and dedicated authenticated webhook ingress: current production
middleware requires a DAIFY proxy signature on non-health/docs API requests.
Do not relax production mode or broadly bypass ingress validation to make a
provider callback work.

## Cost controls and unresolved inputs

Use only free plans; no trials that convert to paid subscriptions, paid add-ons,
auto-recharge or overages. Prefer accounts without payment methods. Render's
bandwidth/build overages can charge an attached payment method; verify the
account state before deployment. If a provider requires a purchase or cannot
honor the zero-spend constraint, retain the local checkpoint and revisit this
selection. Never make a private repository public to obtain a free integration.

No account ownership, domain ownership or residency requirement is confirmed.
Prefer a shared API/database region where available; record actual regions for
web functions, storage, backups and email before using real customer data. Do
not infer Kuwait/GCC or EU residency from a single provider's selected region.
Confirm Netlify integration eligibility for the repository and GitHub quota.
Sentry plan, alert routing, backup destination and always-on production workers
remain future decisions, with no paid service authorized by this plan.

## Recovery and exit

Before hosted acceptance, export an encrypted database backup and separately
copy media objects; back up the MFA key securely outside the database. Restore
to a clean target and prove login/MFA, tenant ownership and published images.
Record measured recovery time and data loss window; do not claim an untested
RPO/RTO or rely on free provider backups. Delete synthetic fixtures when done.
Quota exhaustion or service pause is handled by stopping the demo and retaining
local access, not an automatic paid upgrade.

Execution checklist: [M8](../MILESTONES/M8_PRODUCTION.md).
