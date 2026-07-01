# CLAUDE.md

Operating guide for AI agents (and humans) working in this repo. It records what
the code cannot tell you: how work gets verified, which conventions are
deliberate, and where the traps are. Treat it as authoritative and update it in
the same commit as any process change it describes.

## What this is

upup — an MIT-licensed file uploader: one headless core plus native UI packages
for every major framework, with optional server-mode uploads (client → your
server → S3-compatible storage) and cloud-drive sources (Google Drive, OneDrive,
Dropbox, Box), camera, screen capture, and link imports. pnpm workspace + turbo;
publishable packages are `@upup/*`, released together via changesets.

## Package map

Publishable (`packages/`):

- `@upup/core` — headless engine: file state + orchestrator, upload pipeline
  (compression, HEIC, web-worker offload), cloud-drive plugins, UI controllers,
  i18n, theme/recipes. **Zero framework dependencies — keep it that way.**
- `@upup/react` — the canonical UI. Every other framework matches its DOM.
- `@upup/vue`, `@upup/svelte`, `@upup/angular`, `@upup/vanilla` — native ports
  of the React UI (same DOM contract, same Tailwind classes).
- `@upup/preact` — compat re-export of `@upup/react` via `preact/compat`; the
  image editor lazily loads real React as an isolated island.
- `@upup/next` — client re-export plus `/server` route handlers (App and Pages
  routers).
- `@upup/server` — server-mode endpoints: S3/MinIO presign + proxy upload,
  drive-token exchange, HMAC-signed trust model (signed length, key/uploadId
  binding, required secrets).

Private (`packages/`): `interactive-example`, `storybook-config`,
`tailwind-config` (shared Tailwind/postcss factory — theme edits happen in one
file, not per-package).

Apps (`apps/`): `playground` (main dev app), `landing`, `docs`, `e2e-test`
(Playwright: deep React suite + cross-framework parity), `storybook-react/vue/
svelte/vanilla/angular/preact` (per-framework style-parity references),
`next-example`, `mastra` (agents/tools for the interactive playground).

## Non-negotiable principles

1. **React is the visual canon.** UI changes land in `@upup/react` first; the
   other frameworks are then made DOM-identical (the parity harness enforces
   this byte-for-byte).
2. **No smoke-test theater.** "It renders" is not verification. Features are
   proven by the real e2e gate (real MinIO, real uploads) or a live check in
   the playground/storybooks.
3. **Copy-then-modify, never mass-migrate.** Port components one at a time
   against a working reference; screenshot-driven for visual work.
4. **Duplication over indirection where it aids maintainers.** Per-framework
   hooks/components are intentionally parallel. Do not DRY them into shared
   abstractions that make single-framework edits harder to reason about.
5. **Rebuild before dependents see your edit.** Packages consume each other's
   `dist/`, not `src/`. After editing `packages/core/src`, run
   `pnpm --filter @upup/core build` (same idea for any `packages/*` edit)
   unless the `pnpm run dev:package` watchers are running.

## Gates — run before calling work done

```bash
pnpm install            # Node 20.18.2 (.nvmrc), pnpm 10.11.0 (packageManager)
pnpm run typecheck      # turbo, all packages
pnpm run test           # turbo, all unit suites
pnpm run build          # turbo, all packages
pnpm run e2e            # the REAL gate — see next section
pnpm run prettier-check # CI blocks on this (checks @upup/react src)
pnpm run size           # size-limit bundle budgets
```

Known-red baseline: two `@upup/angular` unit specs fail under jsdom
(pre-existing environment issue, not a regression signal — angular is covered
for real by the e2e gate). Everything else is expected green.

Dev loops: `pnpm run dev` (playground + landing + docs + package watchers),
`pnpm run dev:playground` for the quick loop, `pnpm run dev:storybook` for the
framework storybooks.

## E2E — the real verification

```bash
pnpm run e2e:minio:up    # MinIO via repo-root docker compose + local-dev/.env.minio
pnpm run e2e             # turbo build + deep React suite + cross-framework suite
pnpm run e2e:minio:down  # NOTE: uses -v — wipes the bucket volume
```

- MinIO listens on :9100 (S3) / :9101 (console) per `local-dev/.env.minio`
  (copy `local-dev/.env.minio.example` for OAuth-free defaults). **Never touch
  :9000** — a MinIO container from another project may be running there.
- Docker error "all predefined address pools have been fully subnetted" →
  `docker network prune -f`, then retry.
- The cross-framework webServer boots six storybooks; its start timeout is
  420 s. First boot is legitimately slow — don't kill it.
- Cloud-drive OAuth (Google/OneDrive/Dropbox/Box) is interactive: a human
  performs the login during live checks. Never automate or type credentials.
- Secrets live in `local-dev/.env.minio` and `.env.local` files — never commit
  or print their values.

### Cross-framework parity harness

`apps/e2e-test/cross-framework/` renders the same story in all six frameworks
(Playwright projects `react`, `vue`, `svelte`, `vanilla`, `angular`, `preact`)
and compares normalized DOM + a11y against `parity-fixtures.json`. React is the
source of truth. After an intentional UI change:

1. Set `UPDATE_PARITY=1` and run the parity spec with `--project react`
   (`pnpm --filter e2e-test test:e2e:cf -- --project react`) — fixtures are
   rewritten from React's DOM.
2. Review the `parity-fixtures.json` diff like code.
3. Unset the env var and run the full cross-framework suite — all six must pass.

DOM contract strings (`data-testid="upup-*"`, `data-upup-slot`, `upup-*` CSS
hooks) are shared across all frameworks and asserted by tests. Renaming one is
a cross-framework breaking change: grep every package plus the fixtures before
touching them.

## Naming vocabulary

- `Upup*` — public entry points / brand: `UpupUploader`, `UpupThemeProvider`.
- `Uploader*` — shared internal UI/controller layer: `UploaderPanel`,
  `UploaderHeader`, `useUploaderController`, `UploaderContext`, `UploaderRef`.
- `Source*` — upload-source selection UI: `SourceSelector`, `SourceView`.
- `Drive*` — cloud-drive browsing: `DriveBrowser`, `DriveFile`.
- Upload commands: `startUpload`, `uploadFiles`, `replaceFiles`.
- Legacy `Adapter*` / `Root*` names remain in core internals and in i18n/theme
  keys (`adapters.*`, `adapterButton`, …). A rename backlog exists. Do not
  introduce new `Adapter*`/`Root*` names, and do not partially rename — a
  vocabulary change must sweep all packages, locales, and parity fixtures in
  one pass.

## Git & commits

- Default branch `master`; current integration branch `v2-clean` (the v2 work
  is intentionally unmerged). Do not merge, PR, or push to `master` without an
  explicit maintainer decision.
- Conventional commits: `feat:`, `fix(scope):`, `refactor!:` for breaking.
- **Stage explicit paths only** — never `git add -A` / `.` / `-u`. Never stage
  `dist/`, `test-results/`, `apps/e2e-test/dist/`, or `docs/superpowers/`.
- `docs/superpowers/` is an intentionally untracked local workspace for specs,
  plans, and audit records. This file is the committed source of process truth;
  promote anything durable from there into here.
- Never bypass hooks (`--no-verify`); fix the underlying failure instead.

## CI (`.github/workflows`)

- `main.yml` — PRs to master/dev: prettier → unit coverage → typecheck →
  build → size-limit. **Caveat:** its Test job runs only `test:coverage`,
  which is `@upup/react`'s vitest alone — not `turbo run test`. Local
  `pnpm run test` is stricter than CI.
- `e2e.yml` — PRs to master/dev: full `pnpm run e2e` gate (OAuth-free; MinIO
  env provisioned from the example file).
- `publish.yml` — push to master: changesets release PR, then npm publish of
  all nine packages; on dev: `test-release` dry-run.

## Machine-local notes (primary dev box only)

- The `rtk` token-filter hook rewrites shell commands. Playwright must run
  unfiltered: prefix with `rtk proxy` (e.g. `rtk proxy pnpm run e2e`),
  otherwise the filter mangles the reporter output.
- Long-running user processes (e.g. a Python scraper) may be present — never
  kill unfamiliar PIDs.
