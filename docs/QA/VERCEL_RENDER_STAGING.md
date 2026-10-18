# Vercel + Render staging configuration

The repository architecture supports the selected staging split:

- Vercel runs `apps/web`, the Next.js App Router frontend and same-origin BFF.
- Render runs `apps/api`, the NestJS API.
- Supabase hosts PostgreSQL 17. The runtime URL uses `daify_runtime`; release
  migrations use `daify_migrator` and never run during API startup.

Netlify remains a prepared fallback. It is not part of the selected staging
path. Creating provider projects or deploying is deliberately outside this
repository change.

## Vercel project

Import this GitHub repository and use these exact project settings:

| Setting | Value |
| --- | --- |
| Project name | `daify-staging-web` |
| Framework | Next.js |
| Root Directory | `apps/web` |
| Include source files outside Root Directory | Enabled |
| Node.js | `24.x` (the repository pins `24.18.0`) |
| Install command | From `apps/web/vercel.json` |
| Build command | From `apps/web/vercel.json` |
| Production branch | `feat/m8-staging` until Beta sign-off |
| Automatic deployments | Disabled while the controlled release remains gated |

Set these encrypted environment variables for the staging/Production target:

| Variable | Value |
| --- | --- |
| `NODE_ENV` | `production` |
| `DAIFY_DEPLOYMENT_ENV` | `staging` |
| `DAIFY_WEB_ORIGIN` | canonical Vercel staging origin, HTTPS, no trailing slash |
| `DAIFY_API_URL` | canonical Render origin, HTTPS, no trailing slash |
| `SESSION_COOKIE_NAME` | `daify_session` |
| `PROXY_SIGNING_KEY` | same independently generated 32-byte base64 secret as Render |
| `DAIFY_CLIENT_IP_HEADER` | `x-forwarded-for` |

Vercel documents that it overwrites `x-forwarded-for` at its edge to prevent
spoofing. Before accepting the deployment, send a forged `x-forwarded-for`
request to the public Vercel URL and prove the API receives the Vercel-supplied
address rather than the forged value. Do not enable a custom trusted proxy.

## Render service

Create the Blueprint from the repository `render.yaml`. It specifies the free
Node service `daify-staging-api`, Frankfurt region, health check, manual deploys,
and a three-connection database pool. Keep automatic deploys disabled.

Populate every `sync: false` variable in the Render dashboard. In particular:

- `DATABASE_URL` is the TLS session-pooler URL for `daify_runtime`, never the
  administrator or migrator URL.
- `DATABASE_SSL_CA` is the downloaded Supabase CA PEM.
- `WEB_ORIGIN` exactly equals `DAIFY_WEB_ORIGIN` in Vercel.
- `PROXY_SIGNING_KEY` exactly matches Vercel.
- `MFA_ENCRYPTION_KEY` is a separate backed-up 32-byte base64 secret.
- SMTP and private S3 variables remain required for a public Beta. Their missing
  account/domain setup is an external launch dependency, not a code dependency.

The API must become healthy at `/api/v1/health?database=true` before the web
project is released. Direct API requests without the signed Vercel identity
headers must continue to be rejected.

## Controlled first release

1. Authorize GitHub access in Vercel and Render and create the two free projects.
2. Enter the encrypted variables above directly in each provider.
3. Record the Vercel project ID, Render service ID and canonical HTTPS origins.
4. Run the read-only database release status check against the exact hosted
   roles. The 15 migrations are already present; do not reset the database.
5. Deploy Render at the reviewed commit, verify its health and commit, then
   deploy Vercel at the same commit.
6. Run hosted smoke, spoofing, authentication, Arabic/RTL, tenant isolation,
   menu publish/rollback and private-media checks.

No paid service is required by this configuration. Account plan eligibility and
zero-spend controls must still be confirmed in both provider dashboards.
