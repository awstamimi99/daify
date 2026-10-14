# M1–M4 readiness follow-up — 2026-09-13

The owner authorized continuing the outstanding milestone gates before publishing
and QR work. This follow-up repairs CI, dependency findings and observed text
contrast failures. It does not certify deployment or mark M1/M3/M4 complete.

## Clean checkout and dependency repairs

The latest main-branch [workflow run](https://github.com/awstamimi99/daify/actions/runs/34704646291)
passed browser/API tests but failed API lint with 1,366 unresolved-type errors.
The quality job ran lint before the ignored Prisma client was generated. API
`prelint` now generates the client, so local and CI lint share the same prerequisite.
This was reproduced without the previous local generated directory. The repaired
[workflow run](https://github.com/awstamimi99/daify/actions/runs/34736547952)
passed both quality and Playwright jobs on commit `ef4ddcd`.

Scoped overrides replace Nest's pinned multer with 2.3.0, Prisma config's
deepmerge-ts with 8.0.2, and Prisma CLI's mysql2 with 3.24.4. Compatible js-yaml
updates also resolve a development-tooling finding. Both production and full
dependency audits now report **zero vulnerabilities**. This supersedes the
seven-high-finding count in the September 12 reports, not their other open gates.
The production audit now runs in CI and fails on high/critical findings.

Compatibility review: this repository's Prisma configuration uses plain records
and strings, not the Map merging or renamed custom-merger APIs changed by
deepmerge-ts 8. Config loading, generation, validation, migrations, typecheck,
build and real-PostgreSQL tests passed. mysql2 is a Prisma tooling dependency;
the application's database remains PostgreSQL. No framework major upgrade,
forced audit fix or backend downgrade was applied.

Maintainer references: [multer fixes](https://github.com/expressjs/multer/releases/tag/v2.3.0),
[deepmerge-ts compatibility notes](https://github.com/RebeccaStevens/deepmerge-ts/releases/tag/v8.0.0),
[mysql2 release](https://github.com/sidorares/node-mysql2/releases/tag/v3.24.4).

## Accessibility repairs

The review found low-contrast small text in the homepage phone preview, login
hints, dashboard shell and cards, and Atelier's section numbers and unavailable
items. CSS Modules also scoped the literal global `.eyebrow` and `.container`
selectors, preventing intended dark-section colors and final CTA styling.

Use the existing secondary text/strong red colors where appropriate, correctly
target global classes with `:global`, and retain unavailable-item text opacity
while keeping the grayscale image and explicit sold-out badge. Eight new axe
checks cover homepage, login and both Atelier languages at 1440px and 390px,
including below-the-fold text and horizontal overflow. Authenticated browser
journeys also audit the workspace and account-security screens.

The visual review confirms that the React Atelier proof still differs from the
preserved template: a simple monogram hero replaces the photographic hero; sample
content and section structure differ; the original search experience is absent.
The current proof must not be described as visually identical. Full template
migration is planned for M5, but M1's stricter parity acceptance remains open.
Passing automated accessibility tests does not resolve that design discrepancy
or certify complete application localization.

## Verification

Local verification uses a new PostgreSQL 17 cluster bound to loopback, with an
explicit `daify_readiness_test` database. Existing development/private media and
databases were not cleared. No live provider credentials were available.

| Check | Result |
| --- | --- |
| API lint with no pre-existing generated client | Passed |
| Workspace lint/typecheck and production build | Passed |
| Prisma config, schema and six migrations | Passed |
| API unit/integration suites | 78 passed |
| Compiled web, including eight new accessibility cases | 30 passed |
| Preserved prototype | 17 passed |
| Production and full npm audits | Zero findings |
| Local PostgreSQL dump/restore | 20 tables restored; every row count and content digest matched |

The latest local total is **125 tests**. Audit evidence is checked in under
[readiness-2026-09-13](evidence/readiness-2026-09-13/).
The database restore rehearsal used only disposable local data. It does not
validate a cloud backup, object-store restoration or deployment secret recovery.
The existing non-failing Next `NoFallbackError` diagnostic and pg queued-query
deprecation remain observable; tested requests and journeys passed.

## Remaining acceptance

- **M1:** resolve Atelier visual parity and the documented preview/customizer
  scope discrepancy; complete the remaining visual/localization acceptance.
- **M3:** select/configure actual SMTP and deployment ingress; verify sender and
  inbox delivery, trusted-header overwrite/bypass prevention, MFA secret backup,
  rotation and restoration in deployment; complete the final security review.
- **M4:** select/configure a private S3-compatible bucket and run upload/read/
  detach, tenant/anonymous denial, restart persistence and database/media restore
  checks against that provider. The existing S3 adapter remains unverified live.
- **M5:** publishing, immutable versions, public menu routes and QR have not been
  implemented by this follow-up. Do not treat the local gate repairs as completion
  of the provider or design acceptance above.

The infrastructure decision already points the frontend toward Vercel and lists
R2 as a candidate. Actual backend/database/mail/storage provider choices and
usable deployment configuration are still required; names alone are not proof
of provisioned services or working credentials.
