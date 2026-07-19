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
placed **next to this compose file**. `${VAR}` interpolation fills build args
and runtime env from that file.

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

| Var                               | Purpose                                                 |
| --------------------------------- | ------------------------------------------------------- |
| `NEXT_PUBLIC_BASE_URL`            | Public site origin.                                     |
| `NEXT_PUBLIC_GOOGLE_CLIENT_ID`    | Google Drive picker OAuth client id.                    |
| `NEXT_PUBLIC_GOOGLE_API_KEY`      | Google Drive picker API key.                            |
| `NEXT_PUBLIC_GOOGLE_APP_ID`       | Google Drive picker app id.                             |
| `NEXT_PUBLIC_ONEDRIVE_CLIENT_ID`  | OneDrive picker client id.                              |
| `NEXT_PUBLIC_DROPBOX_CLIENT_ID`   | Dropbox chooser app key.                                |
| `NEXT_PUBLIC_GOOGLE_ANALYTICS_ID` | GA measurement id (optional).                           |
| `NEXT_PUBLIC_POSTHOG_KEY`         | PostHog project key (optional).                         |
| `NEXT_PUBLIC_POSTHOG_HOST`        | PostHog host (defaults to `https://posthog.devino.ca`). |
| `NEXT_PUBLIC_MASTRA_BASE_URL`     | Deployed Mastra base URL for the Ask-AI panel.          |

### Runtime — server-side secrets (read at boot, never in the client bundle)

**landing** (server-mode upload route handlers):

| Var                                                                   | Purpose                                                                |
| --------------------------------------------------------------------- | ---------------------------------------------------------------------- |
| `S3_BUCKET` / `S3_REGION` / `S3_KEY_ID` / `S3_SECRET` / `S3_ENDPOINT` | S3-compatible storage for server-mode uploads.                         |
| `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET`                           | Google Drive server-mode token exchange.                               |
| `DROPBOX_CLIENT_ID` / `DROPBOX_APP_SECRET`                            | Dropbox server-mode token exchange.                                    |
| `ONEDRIVE_CLIENT_ID` / `ONEDRIVE_CLIENT_SECRET`                       | OneDrive server-mode token exchange.                                   |
| `UPUP_UPLOAD_TOKEN_SECRET`                                            | HMAC secret for the upload trust model (required by the upload route). |

**mastra**:

| Var                                                                  | Purpose                                                                              |
| -------------------------------------------------------------------- | ------------------------------------------------------------------------------------ |
| `OPENROUTER_API_KEY`                                                 | LLM provider key for the default model (`openrouter/anthropic/claude-haiku-4.5`).    |
| `ALLOWED_ORIGINS`                                                    | Comma-separated CORS allowlist — the landing origin must be listed.                  |
| `ORIGIN_TOKEN_SECRET`                                                | HMAC origin-token secret. **Stays UNSET on dev** → auth disabled. Set in production. |
| `DAILY_REQUEST_CAP` / `RATE_LIMIT_CAPACITY` / `RATE_LIMIT_WINDOW_MS` | Budget/rate-limit knobs (have sane defaults).                                        |

Never commit real values — this table lists **names only**. Secrets live in the
Dokploy `.env` next to the compose file.
