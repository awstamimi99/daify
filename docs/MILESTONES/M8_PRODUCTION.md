# Milestone 8 — Production / Deployment

## Status

IN PROGRESS — hosting selection and execution planning started 2026-09-30 on
explicit owner instruction (“do it”), with a $0 monthly hosting budget.
No external infrastructure was provisioned by the initial planning checkpoint.
On 2026-10-15, the owner created the Free `daify-staging` Supabase project in
Frankfurt and supplied its session-pooler parameters. The dashboard reports
Healthy; authenticated connectivity, roles, migrations, storage and application
deployment remain unverified. Non-secret identifiers are saved in the
[staging setup runbook](../QA/M8_STAGING.md#supabase-project-record--2026-10-15).

2026-10-15 continuation: M8 preparation was merged into `main` in PR #4.
Work now continues on `feat/m8-staging`; old milestone branches were removed
after verifying that their commits are included in `main`. Local builds,
163 API / 71 compiled-web / 17 prototype tests and Netlify packaging pass.
See [current verification](../QA/M8_2026-10-15.md) and the
[staging setup runbook](../QA/M8_STAGING.md). Hosted acceptance remains open,
including the adapter's monorepo runtime behavior; the local Netlify emulator
cannot resolve its generated `/var/task` imports.

The owner authorized M8 preparation while earlier operational gates remain
open. This sequencing exception does not complete M1/M3/M4/M6/M7 acceptance.
MyFatoorah account setup remains at the end of the pre-launch sequence.

Employee permissions were added locally on 2026-10-15: Owner/Manager/Supervisor/
Support/Sales presets, per-employee grants and customer scope, invitations with
MFA, and audited client-menu editing/publishing. See the
[employee policy and pending commercial rules](../DECISIONS/PLATFORM_STAFF.md)
and [verification](../QA/PLATFORM_STAFF_2026-10-15.md). This is not a hosted
deployment; commercial terms and approvals are implemented locally; applying accepted offers to payments remains pending.

2026-10-15 commercial continuation: coupons, configurable Sales allowances,
custom-price approvals and explicit customer acceptance are implemented locally.
The schema now contains 41 application tables / 15 migrations. See
[commercial-offer verification](../QA/COMMERCIAL_OFFERS_2026-10-15.md).
Accepted terms await future billing activation; hosted acceptance is still disabled.

## Goal

2026-10-17 connection checkpoint: private credential input, separate migration/
runtime role setup and verification, certificate-verified API connections and
bounded pools are prepared and locally tested. The administrator credential is
saved privately; hosted access is blocked on the project CA after a certificate
validation failure. No hosted roles or tables were created.
See [connection setup](../QA/SUPABASE_CONNECTION_2026-10-17.md).

First produce a secure, repeatable free staging demo. Then resolve the remaining
production requirements before any customer launch. Free staging availability
and feature limits are not production acceptance.

## Decisions and baseline

- [Hosting decision and environment matrix](../DECISIONS/HOSTING_M8.md): Netlify
  Free web, Render Free API, Supabase Free database/private storage, conditional
  Resend Free email. Local PostgreSQL/Redis testing remains available.
- [Infrastructure direction](../DECISIONS/INFRASTRUCTURE.md) and
  [architecture](../PRODUCTION_ARCHITECTURE.md) own the system boundaries.
- M7 checkpoint `27643ee`: 162 API, 71 web and 17 prototype tests passed locally;
  production analytics/privacy acceptance remains open.
- `.github/workflows/frontend.yml` runs quality checks and Playwright/API tests
  with PostgreSQL and Redis on pull requests and pushes to `main` /
  `feat/m8-staging`. It also packages the Netlify app without account credentials.
  The separate manual staging workflow waits for these checks before deployment.
  Node is pinned through `.node-version`. Remote CI must be verified for each
  release commit; existing local results do not prove it.

## Execution order

### 1. Local deployment preparation — next implementation checkpoint

- [x] Record the $0 provider selection, constraints and environment matrix.
- [x] Activate M8 and preserve all previous launch gates in the roadmap.
- [x] Add reproducible API deployment configuration with the existing Node 24
  build, Prisma client, runtime dependencies, health endpoint and provider port.
  Verify startup using production validation and graceful shutdown locally.
- [ ] Add Netlify monorepo configuration and prove the exact Next.js adapter
  build, SSR, protected routes, QR native dependencies and secret isolation.
- [x] Add Redis to CI and configure `ANALYTICS_TEST_REDIS_URL` so real worker
  integration cannot silently skip. Preserve PostgreSQL and compiled-web tests.
- [ ] Add a controlled staging deploy workflow after required checks; promote
  the same reviewed commit, serialize migrations and document rollback. Disable
  provider auto-deploy paths that could bypass CI. Check private-repository
  integration support and free Actions/deployment quotas before enabling it.
- [x] Prepare a cold-start retry state and tests for the 15-second API timeout;
  mutations must not be replayed automatically.

Netlify build and artifact inspection pass with Next.js 16.4.0, adapter 5.16.2
and CLI 27.12.1. Public assets exclude the synthetic signing key; Node 24 server
functions, dashboard/admin edge routes and the runner-native Sharp module are
packaged. Local `netlify serve` returns 500 for the generated monorepo handler's
absolute Lambda import path, so hosted SSR/QR and trusted-ingress acceptance
are deliberately not checked off. Release packaging runs on Linux in Actions.
The staging workflow and rollback instructions exist; account settings,
quota eligibility and an executed rollback remain open.

### 2. Account-backed staging acceptance

Account credentials and a verified sender are required here, not for step 1.
No secret should be requested in chat or committed to the repository.

- [ ] Confirm project-owned free accounts, repository eligibility, actual plan
  limits and zero-spend settings; record selected regions. Use synthetic data.
- [ ] Provision one Supabase project with app tables excluded from Data API
  exposure, distinct runtime/migration credentials and a private image bucket.
  Verify database version, TLS, pool limits, migrations and object operations.
- [ ] Configure the Render API and Netlify web using the hosting matrix. Keep
  `NODE_ENV=production`, billing/analytics disabled and development seed off.
- [ ] Prove the edge overwrites client identity headers: test forged headers,
  two independent clients, direct API access, CSRF, cookies and canonical HTTPS
  origins. Record adapter/runtime versions and evidence without secrets.
- [ ] Verify SMTP on the selected alternate port, sender authentication, inbox
  delivery, verification/reset/invitation journeys and security notifications.
  If no sender domain is available, record that acceptance as open.
- [ ] Run bilingual browser smoke tests: signup/login/MFA, organizations/roles,
  tenant isolation, draft/edit/upload, publish/rollback/unpublish, QR stability,
  admin suspension/audit and private support replies/notifications.
- [ ] Verify recovery after idle/sleep and restart, persisted data/media,
  notification retry behavior, private/no-store responses and staging noindex.

### 3. Operational and security readiness

- [ ] Audit identity, session revocation, MFA recovery, step-up, tenant scoping,
  CSRF, HMAC ingress, media parsing and security headers against the architecture.
- [ ] Recheck dependency findings, including the previously recorded moderate
  Multer/platform-express advisories; resolve applicable issues or record an
  explicit acceptance with evidence. Do not infer safety from audit severity.
- [ ] Exercise shared rate limits under bounded load for auth, invitations,
  uploads and analytics where enabled; prove separate clients are independent.
- [ ] Add redacted structured logs and error/health visibility. Select monitoring
  within budget, test an actual alert and document its recipient/escalation path.
  Free API sleep means background notification timing is not guaranteed.
- [ ] Run an encrypted database-plus-media backup and clean-target restore drill,
  with separately secured MFA key recovery; prove permissions, MFA and published
  media after restore. Measure recovery time and recovery point.
- [ ] Test failed migration/deploy handling and rollback to a compatible build;
  document which schema changes require a forward fix or a restore.
- [ ] Write incident, secret rotation, quota exhaustion, provider pause and
  restore runbooks. Identify operator ownership before launch.
- [ ] Measure public-menu LCP/Core Web Vitals and cold/warm requests. Review the
  prototype image payloads and implement required responsive/optimized delivery.
- [ ] Complete English/Arabic/RTL accessibility, M1 visual acceptance and final
  production metadata/sitemap/robots/canonical/QR-domain checks.
- [ ] Close M3 ingress/SMTP/recovery and M4 real object-store gates using the
  hosted evidence. Resolve M7 privacy/retention acceptance before implementing
  and enabling production analytics; retain local analytics coverage meanwhile.

### 4. Final payment and launch gates

Before hosted sandbox testing, explicitly design the distinction between secure
runtime configuration and sandbox feature mode. Current production validation
rejects test payment keys; production ingress also requires a proxy signature
that provider webhooks do not carry. Implement a narrowly authenticated webhook
path and test its failure cases without broadly disabling ingress protection.

### Deferred M6 payment acceptance — required before launch

The owner deferred account-dependent billing verification here on 2026-09-29.
This changes sequencing; M6's remaining requirements are still open.

- [ ] Set up a project-owned sandbox account and configure its test API key,
  dedicated webhook secret and public HTTPS notification endpoint.
- [ ] Complete a provider test-card payment and verify signed delivery,
  subscription activation and duplicate/reordered delivery behavior.
- [ ] Complete the remaining provider-lifecycle acceptance from
  [M6](M6_BILLING_SUBSCRIPTIONS.md), including recurring renewal/failure,
  cancellation and refund/dispute handling.
- [ ] Resolve the live provider/commercial decisions and finish the remaining
  M6 implementation and acceptance before enabling live billing. Record the
  evidence and operational handoff in M6; local sandbox tests alone do not
  satisfy this launch gate.

- [ ] Decide whether the actual hosting budget can support required customer
  availability, background work, backups and monitoring. If not, remain a staging
  demo; do not silently upgrade services or declare production readiness.
- [ ] Resolve production providers, region/residency, domain ownership, secret
  stores, retention, backup targets and service expectations before launch.
- [ ] Confirm earlier milestone gates are complete, run the final regression on
  the release commit, verify remote CI and obtain the concrete launch decision.

## Acceptance and evidence

The first checkpoint is complete when deployment preparation is reviewable and
locally verified. Staging acceptance additionally requires a real HTTPS URL and
recorded provider/ingress/mail/media/browser evidence. M8 itself remains open
until production security, restore, rollback, monitoring, performance,
accessibility and payment gates pass.

Record results under `docs/QA/` with the commit, environment, commands, outcomes
and limitations. Test a failing CI check blocks deployment and prove restore and
alerting by execution. Documentation-only checkpoints need diff/link checks;
runtime changes require focused tests plus the affected quality pipeline.

## Dependencies and risks

M1/M3/M4 operational acceptance, M6 provider/commercial acceptance and M7 privacy
acceptance remain visible dependencies. Free provider sleep, quotas, sender
setup and native Next.js adapter compatibility are explicit staging constraints.
The hosting decision records fallback behavior and unresolved inputs. No
customer data or production availability commitment is assumed by this plan.
