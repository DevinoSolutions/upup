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
  i18n, theme. **Zero framework dependencies — keep it that way.**
- `@upup/react` — the canonical UI. Every other framework matches its DOM.
- `@upup/vue`, `@upup/svelte`, `@upup/angular`, `@upup/vanilla` — native ports
  of the React UI (same DOM contract, same Tailwind classes).
- `@upup/preact` — compat re-export of `@upup/react` via `preact/compat`; the
  image editor lazily loads real React as an isolated island.
- `@upup/next` — client re-export plus `/server` route handlers (App and Pages
  routers).
- `@upup/server` — server-mode endpoints: S3/MinIO presign + proxy upload,
  drive-token exchange, HMAC-signed trust model (signed length, key/uploadId
  binding, required secrets). Node<->Web request/response bridging for the
  Node adapters (express/fastify/`@upup/next`'s pages-handler) lives in ONE
  place — `@upup/server/node-bridge` (`toWebRequest`/`writeWebResponse`); a
  future custom Node adapter imports it rather than re-hand-rolling the
  conversion. `createUpupHandler` requires `storage.type` to be an S3 /
  S3-compatible provider — it throws at construct time for a value with no
  S3 surface (`NON_S3_STORAGE_PROVIDERS` in `@upup/core`, currently just
  `azure`); `hono.ts`/`next.ts` (App Router) are web-native and don't need
  the bridge. `handler.ts` is decomposed by concern (the deferred N4 server
  decomposition, now done — P15): `respond.ts` is the single CORS-safe response
  home — a per-request `Responder` closes over the CORS headers + an
  `x-upup-request-id`, every route returns through `res.json`/`html`/`redirect`/
  `noContent`/`fail`, and **a route composing its own `Response` (any
  `new Response(` outside `respond.ts`) is now a defect**; `upload-routes.ts` is
  the HMAC upload trust boundary in isolation (metadata validation + presign +
  multipart lifecycle + token issue/verify/owner-bind/size-envelope);
  `oauth.ts` is the drive OAuth flow + provider identity; `drive-routes.ts` is
  the authenticated drive list/transfer HTTP routes; `drive-clients.ts` is the
  per-provider drive API calls behind the `DRIVE_CLIENTS` registry
  (`getDriveClient(provider)` — adding a provider is one client-fn pair + one
  row, no dual switch). Residual `handler.ts` is the thin router:
  secret/identity/`storage.type` construct guards + route dispatch building one
  `Responder`. `health.ts` keeps its own self-contained response construction
  (the router hands it `res.headers`).

Private (`packages/`): `interactive-example`, `storybook-config`,
`tailwind-config` (shared Tailwind/postcss factory — theme edits happen in one
file, not per-package), `eslint-config` (shared flat-config factory mirroring
`tailwind-config`; phase 1 lints TS/JS only — `.vue`/`.svelte` SFC and Angular
HTML templates are deferred to phase 2; `@upup/react`/`@upup/preact`
additionally compose its `reactHooksConfig` named export — kept out of the
shared default because vue/svelte composables are also named `use*` and would
false-positive against `react-hooks/rules-of-hooks`).

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
pnpm run prettier-check # CI blocks on this (repo-wide: all 9 publishable packages' src, one root config)
pnpm run size           # size-limit bundle budgets
pnpm run audit:prod     # high+ advisories in the publishable prod trees
pnpm run lint           # eslint flat-config: 9 @upup/* packages + 3 apps — CI's Lint job scopes to the publishable packages only (`turbo run lint --filter='./packages/*'`); the 3 apps' lint is local-only until two pre-existing app-config defects (F-708, F-709) land
```

Baseline: every unit suite is green (16 packages, all 16 turbo `test` tasks
pass). There is no accepted red baseline — a failing spec is a real signal,
never noise. `pnpm run test` runs with `--continue` (one package's failure
can't silently cancel the others' scheduling) and the `test` task depends on
`^build`, so downstream suites always run against freshly-built sibling
`dist/`, not stale output.

`prettier-check`/`prettier-write` are repo-wide (P22, 2026-07-04): one root
`.prettierrc.json` + `.prettierignore` govern all 9 publishable packages'
`src` (`packages/react/.prettierrc.json` is gone — promoted to root,
byte-identical settings). Run either through `rtk proxy`: the rtk filter has
reported "all files formatted" on a red `--check` (see Machine-local notes).

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

The harness compares normalized DOM structure, not rendered geometry. Three
recurring visual traps it will never flag — check these live:

- The uploader panel is a fixed-height container by design; unbounded media
  clips. Every media element (camera, screen capture, previews) needs
  `min-h-0 flex-1 object-contain` — see `CameraUploader` /
  `ScreenCaptureUploader` in each framework for the reference pattern.
- Live previews: bind `srcObject` only after the conditional `<video>` has
  actually mounted (each framework has a mount hook for this; Vue additionally
  guards against function-ref flicker). Binding early yields a silent black
  preview that no DOM assertion notices.
- **Density/variant changes:** the geometry sweep runs each `PARITY_VARIANTS`
  density only; a new density/compact mode requires (a) a
  `<fw>-uploader--<variant>` parity + playground story per framework, (b) a
  variant fixture block, (c) a manual live overflow **and spacing/touch-target**
  check per framework (the harness catches outright clip, never cramped
  spacing).

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
- **Core state/event contract (P6).** Three rulings future changes must not break:
  - **One upload-failure event.** The core event surface has exactly ONE — `upload-error`;
    the bare `'error'` event is retired (`resume()` failures route through `upload-error`;
    the HEIC step diagnostic is `pipeline-error`; angular's `@Output() error` and vanilla's
    `upup:error` DOM event source `upload-error`). Do not reintroduce a second upload-failure
    channel. (`DriveEventMap['error']` is a separate, drive-scoped type — plugins emit
    namespaced `<provider>:error`, never bare `error`.)
  - **`destroy()` is terminal.** After it, `upload/resume/retry/addFiles/setFiles` throw;
    `crashRecovery`/`pipelineEngine` refs are released (but crash-recovery STORAGE is not
    cleared — a normal unmount stays recoverable); `fileManager` is kept so the
    `files`/`progress` getters keep working. Frameworks create a fresh core per mount.
  - **`UploadFile` is immutable in the state layer.** Status/key/metadata transitions go
    through `FileManager.updateFile`, which produces a NEW `File` reference (never an
    in-place mutation) — an object-spread clone would strip File's blob slots. `uploadStatus`
    is a single-source projection of core's `state-change{status}` in the orchestrator;
    a run is single-flight (`activeRun`).
  - **The `core.files` getter is a read-only view** (a defensive copy — completes the
    ownership story the previous ruling opened). No path mutates `FileManager`'s collection
    except through its own methods (`updateFile`/`applyProcessed`/`restore`/`setFiles`/
    `addFiles`/`removeFile`/`removeAll`/`reorderFiles`).
- **Drive-plugin architecture (P16).** Four rulings:
  - **`init(emitter)` is the ONE plugin lifecycle hook.** `UpupPlugin` is
    `{ name; init?(emitter) }` — `setup()` is retired. `PluginManager.register` only
    dedups + stores; `UpupCore.use()` invokes `init` with core's event bus (an
    `EventEmitter`, NOT the core). Consequence: a plugin can't register extensions from
    its lifecycle hook — `core.registerExtension()` is the path (no production plugin did
    lifecycle-time registration). Do not reintroduce `setup`.
  - **`PopupOAuthPlugin` (`drives/popup-oauth-plugin.ts`) owns the client-mode popup
    skeleton** — PKCE, popup poll, token exchange/refresh, proactive-expiry
    (`ensureValidToken` 60 s), lifecycle, and the `apiRequest` 401-retry. Box / OneDrive /
    Dropbox are thin subclasses supplying a `PopupOAuthSpec` (endpoints, scopes, event
    prefix, storage keys, `displayName`, `authParams`) + their genuinely provider-specific
    domain methods (`loadFiles`/`loadMoreFiles`/`downloadFiles`/`mapEntry`/
    `fetchUserProfile`/`searchFiles`), moved verbatim. It is INTERNAL (not in the public
    barrel — that's a future ruling). GoogleDrive is NOT a subclass: its GIS access-token
    model has no PKCE popup / refresh token, so it stays a standalone `implements
    DrivePlugin`. All three popup providers now persist a token-expiry key and refresh
    proactively (Box gained this — F-126); the base emits only the namespaced lifecycle
    events (`<prefix>:state-change`/`:authenticated`/`:session-expired`/`:error`/
    `:signed-out`/`:files-loaded`).
  - **`ServerModeDriveController` is the single server-mode drive abstraction.** The
    unused `ServerOAuth`/`OAuthStrategy` twin (plus the orphaned `OAuthTokens`/`RemoteFile`
    types) is deleted — do not reintroduce a second server-drive path. `CloudProvider`
    stays (consumed by `strategies/server-transfer.ts`).
  - **Adding a provider = a subclass + spec, not a skeleton copy.** A new popup provider
    supplies only its `spec` + domain methods; never re-hand-roll the auth/popup/refresh
    skeleton (that is the F-121 duplication P16 removed).

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
- The pre-commit hook runs the package unit suites (core, react, server) and is
  **auto-wired via `prepare: husky` on `pnpm install`** — no manual
  `git config core.hooksPath` step; the two dead nested `.husky` dirs
  (`apps/landing`, `apps/playground`) were removed. Never bypass the hook
  (`--no-verify`) — fix the underlying failure instead, and see the flake
  protocol above before assuming your change broke something.

## CI (`.github/workflows`)

- `main.yml` — PRs to master/dev: prettier → all-package unit suites
  (`pnpm run test`) + uniform v8 coverage floors on all nine publishable
  packages (`pnpm run test:coverage`) → typecheck → build → size-limit → a prod-scoped
  dependency-audit gate (`pnpm run audit:prod`, `scripts/audit-prod.mjs`) that
  fails on high+ advisories reachable from the 9 publishable packages'
  production trees only (dev-only apps/private-package noise is excluded by
  design). **Dependabot** (`.github/dependabot.yml`) now proposes weekly,
  grouped dependency-update PRs against the workspace + `packages/*` +
  CI-action pins; majors are paused (F-189's deferred migration clusters).
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
