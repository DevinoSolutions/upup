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
   unless the `pnpm run dev:package` watchers are running. Trap: `@upup/preact`
   tests exercise its BUILT bundle (which inlines react), so after react/core
   edits rebuild react + preact before trusting preact test results — a stale
   dist fails with errors whose sourcemaps point at up-to-date `src/` files.
6. **Keep core's mandatory path lean.** Heavy capabilities are opt-in:
   `libheif-js` (HEIC) and `tus-js-client` (resumable) are
   `optionalDependencies` loaded via dynamic `import()` behind subpath exports
   (`@upup/core/steps/heic`, `@upup/core/strategies/tus-upload`), and the
   pipeline worker is a separate module, not inlined. Never add a static
   top-level import of a heavy dependency to core's main entry.
   `.size-limit.json` holds the per-package budgets; `pnpm run size` enforces.
7. **Never weaken the server trust model.** Server-mode requests are
   HMAC-verified (signed length, key/uploadId binding, mandatory secrets) and
   forged or unsigned requests must keep returning 403.
   `packages/server/tests/handler-extended.test.ts` and
   `tests/integration/trust-model.integration.test.ts` assert this — a handler
   change that only passes by loosening a check is the wrong change.
   `@upup/server` upload routes (`/presign`, `/multipart/init`) are
   secure-by-default: they 403 `AUTH_REQUIRED` unless `auth`, `getUserId`, or
   the explicit opt-in `allowAnonymousUploads:true` is configured. The upload
   token's `uid` is enforced on the multipart continuation routes
   (sign-part/complete/abort) whenever `getUserId` is set — a mismatch is 403
   `AUTH_DENIED` — and skipped (token possession is the model) otherwise. The
   server→S3 drive-transfer buffer is bounded at a fixed 5 MB
   (`SINGLE_PUT_MAX_BYTES`); the configurable `multipartThreshold` knob is
   removed so memory safety cannot be raised away.

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

Baseline: every unit suite is green (16 packages, all 16 turbo `test` tasks
pass). There is no accepted red baseline — a failing spec is a real signal,
never noise. `pnpm run test` runs with `--continue` (one package's failure
can't silently cancel the others' scheduling) and the `test` task depends on
`^build`, so downstream suites always run against freshly-built sibling
`dist/`, not stale output.

Flake protocol: if a test fails only in the full run, re-run it isolated
before suspecting your change. Known load-sensitive case:
`@upup/server tests/token-refresh.test.ts` ("refresh success") can exceed its
5 s timeout when the whole suite runs but passes alone.

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

### What the harness cannot catch

The harness compares normalized DOM structure, not rendered geometry. Two
recurring visual traps it will never flag — check these live:

- The uploader panel is a fixed-height container by design; unbounded media
  clips. Every media element (camera, screen capture, previews) needs
  `min-h-0 flex-1 object-contain` — see `CameraUploader` /
  `ScreenCaptureUploader` in each framework for the reference pattern.
- Live previews: bind `srcObject` only after the conditional `<video>` has
  actually mounted (each framework has a mount hook for this; Vue additionally
  guards against function-ref flicker). Binding early yields a silent black
  preview that no DOM assertion notices.

## Naming vocabulary

- `Upup*` — public entry points / brand: `UpupUploader`, `UpupThemeProvider`.
- `Uploader*` — shared internal UI/controller layer: `UploaderPanel`,
  `UploaderHeader`, `useUploaderController`, `UploaderContext`, `UploaderRef`.
- `Source*` — upload-source selection UI: `SourceSelector`, `SourceView`.
- `Drive*` — cloud-drive browsing: `DriveBrowser`, `DriveFile`.
- Upload commands: `startUpload`, `uploadFiles`, `replaceFiles`.
- Lifecycle verb: `destroy()` everywhere (`dispose`/`teardown` are dead);
  removal callback: `onFileRemoved` (past tense — the `onFileRemove` alias is
  dead); file limits are the flat `maxFiles` + size/type props (the
  `restrictions` object is dead). All retired in N3 (2026-07-02) — do not
  reintroduce.
- One name per function, one function per name: no aliased re-exports, and a
  name means the same thing in every package (`createUpupHandler` = the
  @upup/server core factory; `createUpupNextHandler` = its Next wrapper).
- `UploadError` and its subclasses keep their `Upload*` names — error
  taxonomy, not UI vocabulary; only `Adapter*`/`Root*` were retired.
- The `Adapter*`/`Root*` → `Drive*`/`Uploader*`/`Source*` vocabulary sweep is
  COMPLETE in code, i18n keys, and theme slots (N1, 2026-07-01); the cloud-drive
  config is ONE camelCase `cloudDrives` shape end-to-end (N2, 2026-07-02 — the
  snake_case maps are gone). What legacy remains, deliberately: DOM contract
  strings (`upup-adapter-selector`, `data-upup-slot="adapter-selector"`,
  `.uploader-adapter-*` CSS — frozen until the N4 unfreeze), `RuntimeAdapter`
  (kept: environment abstraction), and drive-domain `RootArg`/`RootFolder`/
  `getRootProps` (kept: filesystem-root / dropzone conventions). Do not
  introduce new `Adapter*`/`Root*` names, and do not partially rename — a
  vocabulary change must sweep all packages, locales, and parity fixtures in
  one pass.

How sweeps are done: a small Node codemod — exact-substring replacement,
longest-name-first ordering, an explicit KEEP-list for intentional exceptions —
followed by the full gate. Never per-file hand edits, never word-boundary
regexes (they miss `data-testid` strings and compound identifiers). This
method carried the §16 rename across the whole monorepo without a regression.

## Deliberate decisions — do not "fix"

Choices that look like gaps but are rulings. Re-litigate with the maintainer
if needed; never silently "improve" them:

- **The image editor is react/preact-only.** `@upup/preact` ships the real
  Filerobot editor as a lazily-loaded real-React island (`filerobot-island.js`,
  budgeted separately in `.size-limit.json`); vue/svelte/angular/vanilla
  intentionally stub it. Do not port it to the other frameworks.
- **ffmpeg.wasm was evaluated and rejected** as a pipeline replacement. At most
  it may someday ship as an opt-in video/audio plugin; never wire it into the
  default pipeline.
- **The uploader panel is fixed-height.** Media views adapt to it (see the
  parity-harness traps above); don't make the panel grow to fit content.
- **Per-framework duplication is intentional** (principle 4). The parallel
  hooks/components across frameworks are not a refactor target.

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
- The pre-commit hook runs the package unit suites (core, react, server);
  never bypass it (`--no-verify`) — fix the underlying failure instead, and
  see the flake protocol above before assuming your change broke something.

## CI (`.github/workflows`)

- `main.yml` — PRs to master/dev: prettier → all-package unit suites
  (`pnpm run test`) + uniform v8 coverage floors on core/server/react
  (`pnpm run test:coverage`) → typecheck → build → size-limit.
- `e2e.yml` — PRs to master/dev: full `pnpm run e2e` gate (OAuth-free; MinIO
  env provisioned from the example file), plus `smoke:packages` as a
  sibling `Smoke-Packages` job (real npm-tarball consumer). The
  `apps/playground` deep functional suite (`playground-deep.spec.ts`) is
  local-only — its first gated run surfaced real failures, tracked as F-704.
- `publish.yml` — push to master: changesets release PR, then (when packages
  need publishing) a pre-publish gate — typecheck, unit suites, build, size,
  `smoke:packages` — before `pnpm run release` (`changeset publish`, which
  skips versions already on npm); on dev: `test-release` dry-run.

## Machine-local notes (primary dev box only)

- The `rtk` token-filter hook rewrites shell commands. Playwright must run
  unfiltered: prefix with `rtk proxy` (e.g. `rtk proxy pnpm run e2e`),
  otherwise the filter mangles the reporter output. Same for prettier: the
  filter has reported "all files formatted" on a red `--check` — use
  `rtk proxy` for any prettier run whose result you act on.
- Long-running user processes (e.g. a Python scraper) may be present — never
  kill unfamiliar PIDs.
