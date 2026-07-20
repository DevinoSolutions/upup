# deploy/site — the one-compose site contract

This directory is the single deployment contract for **dev.useupup.com**. One
`docker compose` stack builds and runs three services from the monorepo:

| Service      | Image                   | Internal port | What it serves                                                                            |
| ------------ | ----------------------- | ------------- | ----------------------------------------------------------------------------------------- |
| `landing`    | `Dockerfile.landing`    | `3000`        | The marketing site + interactive demo (Next.js). Bundles the docs under `/documentation`. |
| `mastra`     | `Dockerfile.mastra`     | `4111`        | The Mastra AI server behind the Ask-AI panel (Hono).                                      |
| `playground` | `Dockerfile.playground` | `3000`        | The developer playground (Next.js).                                                       |

All three build from the **monorepo root** as context (`build.context: ../..`).
No host port mappings are declared — Dokploy/Traefik routes to the container
ports over its own network. Each service `expose`s its port for clarity.

## Deploying

Dokploy clones the repo fresh and runs this compose file with a `.env` file
placed **next to this compose file**. `${VAR}` interpolation fills the
build-time `NEXT_PUBLIC_*` args from that file.

Runtime secrets use **bare list-form passthrough** (`- VAR`, no `=`): a var set
in the `.env` file reaches the container, and an **unset** var stays **unset**
(absent, not an empty string). This is required because the `S3_*` and mastra
`ORIGIN_TOKEN_SECRET` schemas are `z.string().min(1).optional()` — an empty
string fails `min(1)` and crashes the app at boot, whereas absent is valid and
just disables that capability.

```bash
docker compose -f deploy/site/docker-compose.yml build
docker compose -f deploy/site/docker-compose.yml up -d
```

## Domain routing (expected Traefik wiring)

| Host / path                           | Target            |
| ------------------------------------- | ----------------- |
| `dev.useupup.com`                     | `landing:3000`    |
| `dev.useupup.com/mastra` (path-strip) | `mastra:4111`     |
| `dev-playground.useupup.com`          | `playground:3000` |

When Mastra is exposed under `dev.useupup.com/mastra`, set
`NEXT_PUBLIC_MASTRA_BASE_URL=https://dev.useupup.com/mastra` so the landing
Ask-AI panel calls the deployed server (unset → falls back to
`http://localhost:4111`, i.e. AI disabled in a real deploy).

## Env contract

### Build-time — landing `NEXT_PUBLIC_*` (inlined into the client bundle)

Passed as `build.args`; changing one requires a landing **rebuild**.

| Var                                                  | Purpose                                                                             |
| ---------------------------------------------------- | ----------------------------------------------------------------------------------- |
| `NEXT_PUBLIC_BASE_URL`                               | Public site origin.                                                                 |
| `NEXT_PUBLIC_GOOGLE_CLIENT_ID`                       | Google Drive picker OAuth client id.                                                |
| `NEXT_PUBLIC_GOOGLE_API_KEY`                         | Google Drive picker API key.                                                        |
| `NEXT_PUBLIC_GOOGLE_APP_ID`                          | Google Drive picker app id.                                                         |
| `NEXT_PUBLIC_ONEDRIVE_CLIENT_ID`                     | OneDrive picker client id.                                                          |
| `NEXT_PUBLIC_DROPBOX_CLIENT_ID`                      | Dropbox chooser app key.                                                            |
| `NEXT_PUBLIC_GOOGLE_ANALYTICS_ID`                    | GA measurement id (optional).                                                       |
| `NEXT_PUBLIC_POSTHOG_KEY`                            | PostHog project key (optional).                                                     |
| `NEXT_PUBLIC_POSTHOG_HOST`                           | PostHog host (defaults to `https://posthog.devino.ca`).                             |
| `NEXT_PUBLIC_POSTHOG_DATASET`                        | Client analytics dataset (`production`/`e2e`/`disabled`), mirrors the server value. |
| `NEXT_PUBLIC_POSTHOG_E2E_TEST_PROJECT_HOST`          | e2e PostHog host (used only when the dataset is `e2e`).                             |
| `NEXT_PUBLIC_POSTHOG_E2E_TEST_PROJECT_CAPTURE_TOKEN` | e2e PostHog capture token (used only when the dataset is `e2e`).                    |
| `NEXT_PUBLIC_MASTRA_BASE_URL`                        | Deployed Mastra base URL for the Ask-AI panel.                                      |

### Build-time — playground `NEXT_PUBLIC_*` (inlined into the client bundle)

Passed as `build.args`; changing one requires a playground **rebuild**. The
playground reads all nine at build time — omitting them ships empty drive creds
and upload config.

| Var                                 | Purpose                                                          |
| ----------------------------------- | ---------------------------------------------------------------- |
| `NEXT_PUBLIC_BASE_URL`              | Public origin; server-mode upload endpoint is `<base>/api/upup`. |
| `NEXT_PUBLIC_GOOGLE_CLIENT_ID`      | Google Drive picker OAuth client id.                             |
| `NEXT_PUBLIC_GOOGLE_API_KEY`        | Google Drive picker API key.                                     |
| `NEXT_PUBLIC_GOOGLE_APP_ID`         | Google Drive picker app id.                                      |
| `NEXT_PUBLIC_ONEDRIVE_CLIENT_ID`    | OneDrive picker client id.                                       |
| `NEXT_PUBLIC_DROPBOX_CLIENT_ID`     | Dropbox chooser app key.                                         |
| `NEXT_PUBLIC_BOX_CLIENT_ID`         | Box picker client id.                                            |
| `NEXT_PUBLIC_UPUP_UPLOAD_ENDPOINT`  | Override upload endpoint (else derived / mock).                  |
| `NEXT_PUBLIC_UPUP_USE_REAL_STORAGE` | `'true'` routes uploads to real server-mode S3 storage.          |

### Runtime — server-side secrets (read at boot, never in the client bundle)

**landing** (server-mode upload route handlers):

| Var                                                                   | Purpose                                                                                                                                                                                                            |
| --------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `S3_BUCKET` / `S3_REGION` / `S3_KEY_ID` / `S3_SECRET` / `S3_ENDPOINT` | S3-compatible storage for server-mode uploads.                                                                                                                                                                     |
| `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET`                           | Google Drive server-mode token exchange.                                                                                                                                                                           |
| `DROPBOX_CLIENT_ID` / `DROPBOX_APP_SECRET`                            | Dropbox server-mode token exchange.                                                                                                                                                                                |
| `ONEDRIVE_CLIENT_ID` / `ONEDRIVE_CLIENT_SECRET`                       | OneDrive server-mode token exchange.                                                                                                                                                                               |
| `UPUP_UPLOAD_TOKEN_SECRET`                                            | HMAC secret for the upload trust model (required by the upload route).                                                                                                                                             |
| `POSTHOG_DATASET`                                                     | Analytics dataset for the support route (`production`/`e2e`/`disabled`; optional).                                                                                                                                 |
| `POSTHOG_E2E_TEST_PROJECT_ID`                                         | e2e project id for ingestion verification by test scripts (optional).                                                                                                                                              |
| `POSTHOG_E2E_TEST_PROJECT_QUERY_READ_ONLY_PERSONAL_API_KEY`           | Read-only (query:read) key for the ingestion-verification e2e spec. **Test-harness only — NEVER set on a production/disabled deploy**: the dataset isolation guard throws by name if a non-e2e runtime carries it. |
| `SMTP_URL`                                                            | SMTP connection string for the support-email leg (optional — absent = email leg `not_configured`).                                                                                                                 |
| `SUPPORT_EMAIL_TO` / `SUPPORT_EMAIL_FROM`                             | Support email destination + sender (optional; placeholders apply if unset).                                                                                                                                        |

**playground** (mounts the same `/api/upup` server-mode upload route): identical
runtime secret set to landing — `S3_*`, `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET`,
`DROPBOX_CLIENT_ID` / `DROPBOX_APP_SECRET`, `ONEDRIVE_CLIENT_ID` /
`ONEDRIVE_CLIENT_SECRET`, `UPUP_UPLOAD_TOKEN_SECRET`. All unset unless real
server-mode uploads are wanted on the playground.

**mastra**:

| Var                                                                        | Purpose                                                                                                                                                                                   |
| -------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `OPENROUTER_API_KEY`                                                       | LLM provider key for the default model (`openrouter/anthropic/claude-haiku-4.5`).                                                                                                         |
| `ALLOWED_ORIGINS`                                                          | Comma-separated CORS allowlist — the landing origin must be listed.                                                                                                                       |
| `ORIGIN_TOKEN_SECRET`                                                      | HMAC origin-token secret. **Omitted from compose on dev** (min(1) — empty crashes boot) → auth disabled. To enable, add a bare `- ORIGIN_TOKEN_SECRET` line + a real `.env` value.        |
| `DAILY_REQUEST_CAP` / `RATE_LIMIT_CAPACITY` / `RATE_LIMIT_WINDOW_MS`       | Budget/rate-limit knobs (have sane defaults).                                                                                                                                             |
| `POSTHOG_DATASET`                                                          | AI-tracing dataset: `production` / `e2e` / `disabled`. Unset with no `POSTHOG_KEY` → tracing off (exporter never constructed).                                                            |
| `POSTHOG_KEY` / `POSTHOG_HOST`                                             | Production PostHog project key + host (used when the dataset resolves to `production`).                                                                                                   |
| `POSTHOG_E2E_TEST_PROJECT_CAPTURE_TOKEN` / `POSTHOG_E2E_TEST_PROJECT_HOST` | Separate e2e PostHog project — used ONLY when the dataset is `e2e`, so automated runs never pollute production.                                                                           |
| `POSTHOG_E2E_TEST_PROJECT_QUERY_READ_ONLY_PERSONAL_API_KEY`                | Read-only query key for e2e ingestion verification. **Test-harness only — NEVER set on a production/disabled deploy**: `observability.ts` throws by name if a non-e2e runtime carries it. |

Never commit real values — this table lists **names only**. Secrets live in the
Dokploy `.env` next to the compose file.
