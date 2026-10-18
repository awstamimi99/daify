# Run and verify DAIFY Beta locally

No hosting accounts or email domain are needed for local development. Use the
Node version in `.node-version`, npm dependencies from the lockfile, Docker (or
a local PostgreSQL 17 plus Redis installation), and the repository root.

## Automated acceptance

The credentials below are only the disposable local Compose credentials.
Keep ports 3100 and 4000 free; Playwright starts its own servers and never
reuses an unknown running instance.

```sh
npm ci
docker compose up -d postgres redis
docker compose exec postgres createdb -U daify daify_beta_test
export TEST_DATABASE_URL='postgresql://daify:daify@127.0.0.1:5432/daify_beta_test?schema=public'
export DATABASE_URL="$TEST_DATABASE_URL"
export ANALYTICS_TEST_REDIS_URL='redis://127.0.0.1:6379/15'
npm run prisma:migrate:deploy --workspace @daify/api
npx --no-install playwright install chromium
npm run lint
npm run typecheck
npm run build
node --test scripts/*.test.mjs
npm run staging:db:test
WEB_TEST_PRODUCTION=true NODE_ENV=test npm test
npm run test:beta
```

`createdb` is for a new disposable database. If that name already exists, verify
that it contains only disposable fixtures or choose another name containing
`test`; do not automatically drop it. Tests delete and rewrite their own data.
Never substitute hosted credentials. Role integration additionally creates and
removes its own unique local databases/roles using the Compose bootstrap account;
the actual application roles it tests have no superuser/role-admin privileges.

The standard run covers sandbox modules as regression protection. The separate
Beta run uses disabled billing/analytics and does not enroll workspaces in test
subscriptions. Both runs use the isolated test mail adapter for synthetic
verification tokens. API transport tests independently exercise real local SMTP
and the real S3 SDK against loopback fixtures. They do not prove hosted delivery,
TLS/ingress behavior, bucket policy or provider availability.

## Manual product use with a local mail inbox

Follow the root README's local setup with separate development `DATABASE_URL`,
`apps/api/.env` and `apps/web/.env.local`. Keep the API in development mode,
`BILLING_MODE=disabled`, `ANALYTICS_MODE=disabled`, `MEDIA_STORAGE=local`, and
`EMAIL_TRANSPORT=smtp`. Start `docker compose up -d postgres mailpit`, apply the
development migrations, then run `npm run dev:api` and `npm run dev:web` in
separate terminals. Set a stable private `MFA_ENCRYPTION_KEY` as described in
the API environment example when testing account security.

Open `http://localhost:3000`, register, and open the actual verification link
from `http://localhost:8025`. Create a business, add categories/items and images,
choose a template, publish, and open the public URL/QR in a separate browser.
Switch Arabic/English, invite a colleague through the local inbox, and verify
the colleague's permitted actions. Log out and back in to confirm persistence.
Stop manual servers before running automated acceptance.

Local media and mail are development services. Production startup deliberately
requires real SMTP and private S3-compatible storage. Keep private env files,
keys, dumps and generated test artifacts out of Git.
