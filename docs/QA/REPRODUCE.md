# Reproduce the 2026-09-12 QA review

Run from the repository root. The audit scripts use local ports 8910 (prototype), 3100 (web), 4000 (API), and 55432 (disposable database). Stop conflicting local services before using these ports. The API must use `NODE_ENV=test` for synthetic verification tokens; this configuration is exclusively for local QA.

The scripts record observed behavior in `evidence/2026-09-12`; rerunning overwrites those JSON files and screenshots. Copy the evidence directory first if retaining the original review matters.

## Disposable database used in this review

Docker/native PostgreSQL were unavailable. The already-installed PGlite packages were used without changing dependencies:

```sh
./node_modules/.bin/pglite-server --port=55432 --host=127.0.0.1 --max-connections=10
```

This starts an in-memory database. The connection name used by the clients is `daify_qa_test`. It is deliberately separate from normal development database settings. In another terminal apply the checked-in migration SQL:

```sh
node <<'NODE'
const fs = require('node:fs');
const { Client } = require('pg');
(async () => {
  const db = new Client({ connectionString: 'postgresql://postgres:postgres@127.0.0.1:55432/daify_qa_test' });
  await db.connect();
  for (const dir of fs.readdirSync('apps/api/prisma/migrations').filter(x => /^\d/.test(x)).sort()) {
    await db.query(fs.readFileSync(`apps/api/prisma/migrations/${dir}/migration.sql`, 'utf8'));
  }
  await db.end();
})().catch(e => { console.error(e); process.exit(1); });
NODE
```

Apply this once to a fresh database. This does **not** validate Prisma migration deployment/history. `prisma migrate deploy` failed against this socket setup during the review. Production migration and concurrency checks must be rerun using a dedicated native PostgreSQL17 test database and the normal migration commands.

## Existing checks

```sh
npm run lint
DATABASE_URL=postgresql://postgres:postgres@127.0.0.1:55432/daify_qa_test npm run typecheck
DATABASE_URL=postgresql://postgres:postgres@127.0.0.1:55432/daify_qa_test npm run build
npm run test:unit --workspace @daify/api
NODE_ENV=test TEST_DATABASE_URL=postgresql://postgres:postgres@127.0.0.1:55432/daify_qa_test npm run test:integration --workspace @daify/api
npm run test:prototype -- --workers=2
```

The integration suite deletes fixtures; run it only against the disposable test database and **before** creating the exploratory fixtures below. Build before starting development servers to avoid competing generated outputs.

## Start local servers

Run each service in its own terminal:

```sh
NODE_ENV=test DATABASE_URL=postgresql://postgres:postgres@127.0.0.1:55432/daify_qa_test WEB_ORIGIN=http://127.0.0.1:3100 PORT=4000 LOG_LEVEL=error node apps/api/dist/main.js
```

```sh
DAIFY_API_URL=http://127.0.0.1:4000 DAIFY_WEB_ORIGIN=http://127.0.0.1:3100 npm run dev --workspace @daify/web -- --hostname 127.0.0.1 --port 3100
```

```sh
python3 -m http.server 8910 --bind 127.0.0.1
```

Then:

```sh
DATABASE_URL=postgresql://postgres:postgres@127.0.0.1:55432/daify_qa_test npm run test:web -- --workers=2
node docs/QA/qa-browser.cjs
node docs/QA/qa-auth.cjs
node docs/QA/qa-prototype.cjs
node docs/QA/qa-accessibility.cjs
```

`qa-auth.cjs` creates verified `qa-*` accounts and an organization with two branches, and deliberately exercises membership changes on those fixtures. `qa-accessibility.cjs` uses the latest owner fixture created by that script. `qa-prototype.cjs` uses a fresh browser context and changes only its localStorage. `qa-browser.cjs` enumerates the known local page files; it does not click every control.

API throttling remains enabled. If repeat exploratory runs produce429, wait until the60-second rate window expires, or restart **only the disposable QA API process**. Do not count a rate-limited fixture setup as evidence that a business operation passed or failed.

The negative API examples in `api-negative-audit.json` were one-off requests against an additional QA organization: whitespace-only names, `Not/A_Timezone`, currency `ZZZ`, duplicate branch slug, and a malformed `daify_session=%ZZ` cookie. Exact inputs/status expectations are recorded in D11–D13 of the review.

Stop the servers when finished. Stopping the in-memory PGlite server destroys the synthetic database. The JSON/screenshot evidence remains on disk. No production data or production credentials are required.
