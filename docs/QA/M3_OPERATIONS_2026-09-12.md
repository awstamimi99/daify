# M3 continuation: proxy identity, API contract and security operations

Date: 2026-09-12. This follows [recoverable MFA](MFA_2026-09-12.md).
The owner authorized completing M3 before moving to M4, and confirmed that
email and hosting providers have not been selected. M3 remains **IN PROGRESS**
until its external operational checks and final acceptance review are complete.
No provider was configured, real email sent, real role granted, or deployment made.

## Implemented and verified locally

- The Next server signs client IP, timestamp, HTTP method and API path with a
  dedicated shared key. The API checks the signature and its 30-second validity,
  rejects tampering, and ignores arbitrary forwarding headers. Production fails
  closed without trusted proof, apart from public health and documentation.
  Read requests from server-rendered pages carry the same identity as mutations.
- Rate-limit counters are atomic PostgreSQL records shared across API instances.
  Concurrent requests cannot exceed the per-route allowance. Expired records are
  cleaned in batches; `Retry-After` and rate headers reach the browser. Liveness
  and the API document do not depend on the rate-limit database.
- Every current versioned controller route has request, response and error
  schemas. Tests discover controller routes, compile all schemas and validate
  live auth/workspace/MFA responses against the contract, including rejection
  of extra sensitive fields. Cookie naming reflects the configured API value.
- MFA confirmation and recovery-code use enqueue account-owner alerts in the
  transaction. An API worker leases committed jobs, sends outside the
  transaction, retries at increasing intervals and records exhausted jobs after
  five failed sends. Stable Message-ID values assist deduplication; SMTP delivery
  is at least once, so a crash after acceptance can cause a duplicate alert.
- Added non-sending SMTP preflight and MFA-key inspection/rotation commands.
  Rotation is dry-run by default, checks both active and pending secrets and
  applies changes atomically only when explicitly requested in maintenance mode.
- Fixed a timestamp mismatch exposed by retry tests on a non-UTC PostgreSQL
  server: application connections now explicitly use UTC so SQL time and Prisma
  dates agree.
- Updated Next.js and its ESLint configuration to 16.3.3 and compatible patch
  dependencies. The production browser job now builds and tests `next start`.
  No remote CI run is claimed.

## Evidence

All **103 unique tests passed**: API 65 across 14 suites, compiled-production web
21, preserved prototype 17. Build, TypeScript, lint, Prisma validation and
migration status passed. Four migrations are applied in isolated PostgreSQL 17.
The browser cases include full signup/verification/workspace/team/MFA/recovery
and two clients sharing the Next proxy. Integration tests also use two API
instances sharing counters, malicious/expired proofs, retry exhaustion,
expired worker leases, key rotation and UTC timestamp consistency.

Logs: [evidence directory](evidence/2026-09-12-m3-operations/).
Intentional failure-path tests emit sanitized errors; those are expected.
No test secrets, real provider credentials or MFA recovery codes are included.

## Deployment runbook and outstanding checks

### Trusted ingress and rate limits

1. Choose the actual web ingress and API hosting topology. Configure a dedicated
   32-byte base64 `PROXY_SIGNING_KEY` on the Next server and API. It must differ
   from the MFA encryption key and must never be `NEXT_PUBLIC_*`.
2. Set `DAIFY_CLIENT_IP_HEADER` on the Next server to a header that the ingress
   **overwrites**, and prevent requests from bypassing that ingress. The local
   test header is a fixture and must never be deployed as a public trust policy.
   Vercel's `x-vercel-forwarded-for` is an option only after verifying the selected
   topology; a Cloudflare header alone does not establish trust on an exposed
   origin. Use HTTPS or a secured private connection between web and API.
3. Apply migrations with `npm run prisma:migrate:deploy --workspace @daify/api`.
   Synchronize server clocks. Keep health checks at `/api/v1/health` and optionally
   `/api/v1/health?database=true`.
4. In staging, prove that five login attempts from client A trigger a 429 while
   client B remains unaffected; forged forwarding headers must not change A's
   bucket. Repeat across API instances and check recovery after the block expires.
   Local tests pass; this actual-ingress test is still pending provider selection.

This follows [Nest's throttling storage guidance](https://docs.nestjs.com/security/rate-limiting),
[Vercel's header policy](https://vercel.com/docs/headers/request-headers) and
[PostgreSQL's atomic conflict handling](https://www.postgresql.org/docs/18/sql-insert.html).

### Email

1. Configure the provider, verified sender and TLS settings in the API environment.
   Run `npm run smtp:verify --workspace @daify/api`. It checks connectivity/TLS/auth
   without sending. Passing preflight does not prove sender authorization or inbox delivery.
2. With an explicitly approved test recipient, exercise signup verification,
   password reset, invitations, MFA changes and recovery alerts in staging.
   Check inbox/spam, sender authentication and one-use links. This has **not** run.
3. Verification/reset/invitation delivery remains synchronous: errors are surfaced,
   and requesting a replacement link retries with a new token. Security alerts
   alone use the durable worker. Keep an API process running for that worker.
4. Monitor `security-notification.retry` and `security-notification.exhausted` events,
   and pending/failed counts in `security_notifications`. For example:

   ```sql
   SELECT count(*) FILTER (WHERE "sentAt" IS NULL AND "failedAt" IS NULL) AS pending,
          count(*) FILTER (WHERE "failedAt" IS NOT NULL) AS failed
   FROM security_notifications;
   ```

   After resolving a provider problem, an operator may deliberately requeue a
   specific failed notification by clearing its `failedAt`/`lockedUntil`, resetting
   attempts to zero and setting `nextAttemptAt` to the current time. Delivery,
   monitoring, requeue and retention procedures still need staging acceptance.

### MFA key backup, restore and rotation

1. Store `MFA_ENCRYPTION_KEY` separately from database backups. Restore a database
   backup into an isolated environment and supply the backed-up key.
2. Run `npm run mfa:key --workspace @daify/api` there. It reports counts only and
   verifies that both active and pending MFA secrets decrypt. It does not rotate
   data without `--apply`. Complete a test login as part of the restore drill.
3. To rotate, stop **all API writers**, take recoverable database/key backups,
   configure a different `MFA_NEXT_ENCRYPTION_KEY`, and first run the dry check.
   Set `MFA_ROTATION_MAINTENANCE=true` and invoke:

   ```bash
   npm run mfa:key --workspace @daify/api -- --apply
   ```

4. Keep writers stopped until all instances use the new `MFA_ENCRYPTION_KEY`.
   Run the check with that key and verify login before resuming. Retain the old
   key securely for backups encrypted under it. A code/schema rollback alone
   cannot undo a key rotation: restore a matching database/key pair or perform
   a deliberate reverse rotation while in maintenance.

The command and cryptographic round trip passed on disposable fixtures. Actual
secret-manager backup/restore and operator rehearsal remain unverified. Loss of
both authenticator and recovery codes still has no self-service MFA bypass.

## Dependency audit disposition

The refreshed production dependency audit has **0 critical, 7 high** findings.
The count includes affected parents; it is not seven separate application exploits.
Next.js's critical advisories were addressed with the
[maintainer's patched version](https://github.com/vercel/next.js/security/advisories/GHSA-2xp9-vwfh-vxw4);
the compatible sharp patch addresses its
[underlying image-library advisory](https://github.com/lovell/sharp/security/advisories/GHSA-rgj7-g3m4-5g8c).
Compatible fast-uri, qs and Joi updates also removed reported findings.

Remaining dependency paths:

| Path | Current exposure and required follow-up |
| --- | --- |
| Nest platform-express → multer 2.2.0 | No multipart/upload endpoint is registered in M3. Resolve its patched-version compatibility before implementing M4 uploads. |
| Prisma/config → deepmerge-ts 7.1.5 | Configuration tooling; this application does not merge attacker-supplied recursive config. The proposed patch is a major version and needs compatibility review. |
| Prisma → mysql2 3.15.3 | The application uses the PostgreSQL adapter, not MySQL connections. Review the pinned CLI dependency update and deployed dependency footprint. |

No force upgrade or framework downgrade was applied. This audit is **not clean**;
the remaining findings require a recorded release/security disposition. Earlier
M2's zero-finding audit is historical evidence, not the current dependency state.

## Gate to M4

The requested local proxy, contract and security-operation implementation is
complete and tested. M3's remaining acceptance depends on provider selection,
real ingress/email tests, a backup/restore rehearsal and final security review.
M4 remains unstarted under the roadmap's milestone gate. The owner's instruction
already authorizes proceeding to M4 once M3 closes; no repeat kickoff request is
needed. First M4 work is tenant-scoped menu/section/item CRUD and its dashboard,
followed by translations and validated media. Publishing and QR remain M5.
