# Testing

How upup is verified: the layers, the commands, the CI routing, and the
workflows around parity fixtures, MinIO, and credentials. CLAUDE.md holds the
repo-wide process rules; this file is the testing deep-dive. If the two ever
disagree, fix the drift in the same PR.

## Test layers

| Layer                         | Lives in                                                                                                                                                  | Proves                                                                                                                                                                                                                                                                                                                                                                                                                                                                           | Command                                                                               |
| ----------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------- |
| Core unit/behavior            | `packages/core/tests` + `src/**/__tests__` (~1,600 tests)                                                                                                 | uploader state machine, restrictions, event contract + order, destroy/crash-recovery semantics, pipeline steps, worker offload, strategies, i18n, theme, drive plugins, multipart session store                                                                                                                                                                                                                                                                                  | `pnpm --filter @upupjs/core test`                                                     |
| Core real-I/O integration     | `packages/core/tests/integration`                                                                                                                         | real HEIC WASM decode, real Skia canvas compression/thumbnail — no mocks of the code under test                                                                                                                                                                                                                                                                                                                                                                                  | runs inside the core `test` task                                                      |
| Framework adapters            | `packages/{react,vue,svelte,angular,vanilla,preact,next}/tests` (or `src/**/*.spec.ts`)                                                                   | hook/component behavior, SSR safety, accessibility (jest-axe), fresh-core-per-mount, event forwarding, public-API pins                                                                                                                                                                                                                                                                                                                                                           | `pnpm --filter @upupjs/<fw> test`                                                     |
| Server trust model            | `packages/server/tests`                                                                                                                                   | HMAC upload-token trust (forged → 403), signed size envelope, key/uploadId/uid binding on sign-part/complete/abort, CORS + `x-upup-request-id` on every route (structural pin), OAuth return safety, token stores, 5 MB transfer bound                                                                                                                                                                                                                                           | `pnpm --filter @upupjs/server test`                                                   |
| Server ↔ real MinIO           | `packages/server/tests/integration` (env-gated `UPUP_E2E_MINIO=1`)                                                                                        | byte integrity (sha256 round-trips), presigned-PUT oversize rejection at the storage layer, multipart envelope abort with Head/ListParts negative proofs                                                                                                                                                                                                                                                                                                                         | `pnpm run e2e:minio:test` (MinIO up first)                                            |
| Cloud-drive live integration  | `packages/server/tests/integration/drive-clients-live.integration.test.ts` (env-gated `UPUP_DRIVE_SANDBOX=1` + per-provider sandbox secrets)              | real list/folder-nav/search/download against Box/Dropbox/Google Drive/OneDrive sandbox accounts — byte-exact sha256 round-trips through `drive-clients.ts`; skips green without a provider's secrets, reds on a configured-but-broken token                                                                                                                                                                                                                                      | `pnpm run drive:sandbox:test` (nightly-only in CI; see `docs/drive-sandbox-setup.md`) |
| Cloud-drive server-transfer   | `apps/e2e-test/drive-sandbox/server-transfer.spec.ts` (env-gated `UPUP_DRIVE_SANDBOX=1` + per-provider sandbox secrets + MinIO)                           | all four providers' sandbox creds proven through `@upupjs/server`'s HTTP surface (route dispatch → drive auth → drive→S3 transfer) into a real MinIO bucket, byte-exact sha256; plus the >5 MiB multipart path, unicode filenames, policy boundaries (413/415/streamed-cap abort with nothing persisted), and the native-Google-Doc pin (lists with a quota size, transfer fails clean 500); skips green per-provider without creds/MinIO, reds on a configured-but-broken token | `pnpm --filter @upupjs/e2e-test test:e2e:drive-sandbox` (nightly-only in CI)          |
| Deep React e2e                | `apps/e2e-test/e2e` (Playwright, vite app on :3333)                                                                                                       | render, file interactions, restrictions UI, upload flow vs mock endpoints, keyboard-only operation                                                                                                                                                                                                                                                                                                                                                                               | `pnpm --filter @upupjs/e2e-test test:e2e`                                             |
| Cross-framework parity        | `apps/e2e-test/cross-framework` (six storybooks)                                                                                                          | byte-identical normalized DOM + a11y contract across react/vue/svelte/vanilla/angular/preact, real uploads to MinIO                                                                                                                                                                                                                                                                                                                                                              | `pnpm run e2e` (both suites)                                                          |
| A11y ratchet + overflow sweep | `apps/e2e-test/cross-framework/a11y-overflow.spec.ts` (own config, serial)                                                                                | axe serious/critical ratchet vs `a11y-baseline.json`; media views never clip their fixed-height container                                                                                                                                                                                                                                                                                                                                                                        | `pnpm run e2e:a11y` (nightly in CI)                                                   |
| Visual product-state PNGs     | `apps/e2e-test/visual/product-state-screenshots.ts` + captures inside the parity/smoke specs and `e2e/visual-product-states-frozen-for-snapvisor.spec.ts` | deterministic screenshots of named product states (parity mount/populated ×6 frameworks, real-upload success ×6, deep-react themes/lifecycle/restrictions) — the rendered geometry/paint the DOM harness can never see; future snapvisor.io diff input                                                                                                                                                                                                                           | captured by `pnpm run e2e`; PNGs land in `apps/e2e-test/screenshots/`                 |
| Package smoke                 | `scripts/package-smoke-consumer.mjs`                                                                                                                      | packed tarballs install into an isolated vite consumer: exports resolve, no `workspace:` leaks, worker chunk stays separate, no server deps in browser bundles, size budgets                                                                                                                                                                                                                                                                                                     | `pnpm run smoke:packages`                                                             |
| Script self-tests             | `scripts/ci/*.test.mjs`, `scripts/lib/tarball.test.mjs` (node:test)                                                                                       | the quality guard's rules and the CI impact map themselves                                                                                                                                                                                                                                                                                                                                                                                                                       | `pnpm run test:scripts`                                                               |
| Test-quality guard            | `scripts/ci/test-quality-guard.mjs`                                                                                                                       | no committed `.only`, silent skips, tautologies, vague names, unjustified sleeps, integration-layer mocks; regen guards stay present; no `continue-on-error`                                                                                                                                                                                                                                                                                                                     | `pnpm run test:quality`                                                               |
| Mastra deterministic          | `apps/mastra/src/**/*.test.ts`                                                                                                                            | config-patch tool zod boundary, middleware guards, schema↔core drift, canned-prompt key validity — offline, zero LLM calls                                                                                                                                                                                                                                                                                                                                                       | `pnpm --filter @upupjs/mastra test`                                                   |
| Mastra LLM evals              | `apps/mastra/src/evals/run.ts` (~20 canned prompts)                                                                                                       | the live agent produces patches with required/forbidden keys                                                                                                                                                                                                                                                                                                                                                                                                                     | `pnpm --filter @upupjs/mastra eval` (live server + paid key; nightly-only in CI)      |
| Landing feedback + ingestion  | `apps/e2e-test/landing/*.spec.ts` (own config, serial; env-gated on the shared PostHog e2e project)                                                       | the /support form (happy path, reply-guard, double-submit, forced-502 retry with same feedbackId) + the Ask-AI thumbs flow (rating lock, comment, thanks) drive REAL ingestion into the shared e2e project, then a serial spec VERIFIES via the PostHog Query API that this run's events (matched by `test_run_id`) actually landed; skips green without creds, reds on a configured-but-broken query key                                                                        | `pnpm run e2e:landing` (nightly-only in CI)                                           |
| Playground deep suite         | `apps/playground/e2e`                                                                                                                                     | broad mobile-viewport product flows                                                                                                                                                                                                                                                                                                                                                                                                                                              | local-only (F-704)                                                                    |

Every one of the nine publishable packages also pins its exact public export
list (`public-api.test.ts`/`.spec.ts`; core additionally pins `./internal`),
and the type-level halves (`expectTypeOf`, `@ts-expect-error`) are enforced by
the typecheck gate via each package's `tsconfig.test.json`.

## Local commands

The full gate list (run before calling work done) is in CLAUDE.md ("Gates").
Testing-specific quick reference:

```bash
pnpm run test           # all unit suites (turbo, --continue, ^build)
pnpm run test:coverage  # per-package v8 coverage ratchets
pnpm run test:quality   # test-suite hygiene guard
pnpm run test:scripts   # node:test self-tests for scripts/ci + scripts/lib
pnpm run e2e:minio:up   # MinIO on :9100 (NEVER :9000 — foreign container)
pnpm run e2e            # deep React + cross-framework parity (real MinIO)
pnpm run e2e:minio:test # server trust/byte-integrity vs real MinIO
pnpm run e2e:a11y       # axe ratchet + overflow sweep (six storybooks, serial)
pnpm run e2e:minio:down # NOTE: -v — wipes the bucket volume
pnpm run smoke:packages # tarball consumer (~5 min)
```

Ad-hoc MinIO-dependent invocations must go through the root scripts (they wrap
`dotenv -e local-dev/.env.minio --`); never hand-source the env file.

## CI: what runs when

**Every PR (main.yml — never routed):** prettier → test-quality guard →
script self-tests → all unit suites → coverage ratchets → env/vocab checks →
typecheck → build → size → prod dependency audit → lint/oxlint/knip, rolled
up by the required **Status Check**.

**Every PR (e2e.yml — routed):** `Resolve-Affected` classifies the diff with
`scripts/ci/resolve-affected-tests.mjs` and heavy jobs run only when needed.
The impact map is code, exported for unit tests. Precedence per file:
UNIVERSAL config > docs/markdown (light) > targeted package rules > light
directories > **fail-open (unmatched paths run everything)**. Summary:

| Changed path                                                                                                     | e2e | minio | smoke |
| ---------------------------------------------------------------------------------------------------------------- | --- | ----- | ----- |
| `packages/core/**`, `packages/server/**`                                                                         | ✓   | ✓     | ✓     |
| other framework packages (`react`…`next`)                                                                        | ✓   |       | ✓     |
| `packages/storybook-config/**`, `apps/storybook-*/**`                                                            | ✓   |       |       |
| `apps/e2e-test/**`                                                                                               | ✓   | ✓     |       |
| `docker-compose.yml`, `local-dev/**`, e2e/env scripts                                                            | ✓   | ✓     |       |
| smoke consumer script, `scripts/lib/**`                                                                          |     |       | ✓     |
| root manifests, lockfile, turbo, workflows, any `tsconfig*`/`vitest`/`vite`/`playwright` config, `scripts/ci/**` | ✓   | ✓     | ✓     |
| markdown anywhere, `docs/**`, landing/docs/playground/next-example apps, interactive-example, mastra             |     |       |       |
| **anything unmatched**                                                                                           | ✓   | ✓     | ✓     |

The required **E2E Status Check** rollup fails on any skip the resolver did
not sanction (and on a failed resolver), so routing cannot hide required
coverage. Branch protection must require BOTH rollups (F-780).
`workflow_dispatch` forces every suite (`--all`).

The E2E job uploads two artifacts: `e2e-visual-screenshots` (**always** — the
visual layer's PNGs, see "Visual screenshots" below) and
`e2e-playwright-artifacts` (traces + reports, failure only).

**Nightly (nightly.yml, 03:17 UTC + manual):** full e2e + MinIO suites +
a11y/overflow sweep (with `nightly-visual-screenshots` uploaded always and
Playwright trace/report artifacts on failure),
static builds of all six storybooks, package smoke, the mastra LLM evals, and
the cloud-drive live integration suites — the `Drive-Sandbox` job runs both the
vitest client-direct suite and a Playwright HTTP-surface layer (all four
providers through `@upupjs/server` into MinIO, incl. the >5 MiB multipart and
policy-boundary paths). Nothing publishes
from nightly. Both the evals and the drive-sandbox job skip green (with a
`::notice`) when their secrets are absent, so a fork with no credentials still
goes green. The playground deep suite stays local-only until F-704 is resolved.

## Cross-framework parity workflow

React is the visual canon. After an intentional UI change:

1. `UPDATE_PARITY=1` + run the parity spec `--project react` — fixtures are
   rewritten from React's DOM (react-only; other projects no-op).
2. Review the `parity-fixtures.json` diff like code.
3. Unset, run all six projects — all must pass.

Regeneration is forbidden in CI by three independent layers: in-spec throws
(`parity.spec.ts`, `a11y-overflow.spec.ts`), workflow shell guards, and the
quality guard's structural check that the in-spec throws still exist.

Known divergences are self-liquidating forcing functions:
`KNOWN_DIVERGENCES` (DOM) asserts the divergence still exists for
non-`assertOnly` frameworks — the moment a framework heals, the test fails
until the entry is deleted. `A11Y_GAPS` entries assert presence matches the
`ported` list per framework, and an entry whose `ported` covers every
framework must be deleted (its gap has healed; keeping it would silently
exclude that token from parity capture forever).

The a11y baseline (`a11y-baseline.json`) is a reviewed per-framework ceiling
on axe serious/critical findings — a new rule id or a higher count fails;
regenerate deliberately with `UPDATE_A11Y_BASELINE=1` (never in CI).

What no DOM harness can catch — check live: fixed-height panel overflow
(media views need `min-h-0 flex-1 object-contain`), `srcObject` binding after
mount, density/spacing cramping. See CLAUDE.md "What the harness cannot catch".
The visual-screenshot layer below narrows this hole (geometry/paint drift
becomes a reviewable image diff) but does not replace the live checks: it only
sees the states the suites drive.

## Visual screenshots (snapvisor.io)

The e2e suites freeze named product states as PNGs via
`apps/e2e-test/visual/product-state-screenshots.ts`
(`captureProductStateScreenshot`). This is the geometry/paint complement to
the DOM parity harness, and the input for **snapvisor.io** — our Argos-style
visual-diff service — once its uploader is wired into CI. Until then the PNGs
ship as plain workflow artifacts (`e2e-visual-screenshots` on PRs,
`nightly-visual-screenshots` on nightly) and are reviewed by humans.

**Naming contract** (snapvisor will key diffs on these paths — treat renames
like fixture changes, not refactors):

```
apps/e2e-test/screenshots/<suite>/<framework>/<flow>--<state>.png
  suite      cross-framework | deep-react
  framework  react | vue | svelte | vanilla | angular | preact
  flow       product flow, e.g. uploader-parity-default, real-upload-client
  state      frozen state, e.g. mount-source-selector, upload-failed
```

**Current inventory:** parity spec captures `mount-source-selector` +
`image-and-pdf-files-added` per framework (12), the real-upload smoke captures
`upload-successful` per framework (6), and the deep-react visual spec
(`e2e/visual-product-states-frozen-for-snapvisor.spec.ts`) captures both
themes, the link source view, and the upload lifecycle
(selected/uploading/successful/failed) plus the restriction-rejection contract
(8).

**Determinism rules** (all enforced inside the helper — no caller sleeps):
element screenshots of the uploader root only, CSS-pixel scale (DPR-agnostic),
animations fast-forwarded, caret hidden, `document.fonts.ready` + image
`decode()` awaited first, and inherently-live regions (progress bars) masked
by the caller in `#ff00ff`. There are **no committed golden images and no
regen mode** — snapvisor owns baselines server-side, so a capture can never
launder a regression into this repo (nothing here for the regen guards to
protect).

**Adding a capture:** reach the state with a real behavioral assertion first
(`data-state`, slot visibility — the screenshot proves what it looked like,
the assertion proves it happened), then call `captureProductStateScreenshot`
with a flow/state pair that reads as product language. Mask anything a human
would describe as "mid-motion".

## MinIO

`docker compose` at the repo root, ports `:9100` (S3) / `:9101` (console) from
`local-dev/.env.minio` (copy `.env.minio.example` for OAuth-free defaults).
Never touch `:9000` — a foreign MinIO may live there; the env validator
rejects those ports. "address pools have been fully subnetted" →
`docker network prune -f`. Integration tests delete the objects they create
(batched `DeleteObjects` in `afterAll`); object keys are per-run unique by
construction (`defaultKeyStrategy` prepends `<user|anon>/<uuid>/`).

## Test-quality guard

`pnpm run test:quality` scans every tracked test file and workflow. Findings
are fixed, not suppressed — the exception list ships empty and is
inverse-forced (a stale entry fails). Justification markers, same line or up
to 3 lines above:

- `sleep-allow(<why this wait cannot be event-driven>)` — for
  `waitForTimeout`/awaited-promise sleeps in Playwright specs (mock-latency
  shaping, negative-assertion windows, media record durations).
- `boundary-mock(<external service>)` — for `vi.mock` inside
  `*.integration.test.ts`/Playwright specs; only true external boundaries
  (drive APIs, OAuth) qualify.
- `skip-allow(owner=<who> reason=<why> until=YYYY-MM-DD)` — for any disabled
  test; expiry is enforced, so skips self-liquidate.

Playwright's conditional `test.skip(expr, 'reason')` needs no marker.

## Naming conventions

Test names are behavior sentences:
`<actor/state> can/cannot <action> when <condition>, and <result>` — e.g.
"multipart completion is refused when uploaded bytes exceed the signed size
envelope". File names describe the protected behavior
(`upload-token-trust-…`, `uploader-mount-creates-fresh-core-…`); the guard
rejects meaningless basenames (`utils`, `misc`, `index`, …) and vague/
single-word titles. Helpers are product-named (`buildHeicFile`,
`feedFileUntil`, `installWorkerProbe`), never `setupData`/`doUpload`.

## Third-party services & credentials

**PR CI requires zero third-party credentials.** Upload behavior is proven
against MinIO; provider UI states use the storybook-config MSW fixtures;
drive-provider API clients are unit-tested against their documented contracts,
and — opt-in, nightly only — exercised against real disposable sandbox drive
accounts (`docs/drive-sandbox-setup.md`). Never use production accounts, keys,
OAuth apps, buckets, or customer data in any test, and never commit a credential
(secrets live in GitHub Actions secrets or gitignored `local-dev/.env*` files).

Configured optional credentials:

| Secret / env var                                                                                                                                   | Used by                                                     | Purpose                                                                                                              | Behavior when absent                                                                                                |
| -------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------- |
| `OPENROUTER_API_KEY` (Actions secret)                                                                                                              | nightly `Mastra-Evals` job + `Landing-Feedback` thumbs flow | drives ~20 canned prompts through the live agent (paid LLM calls, model `anthropic/claude-haiku-4.5` via OpenRouter) | job green with a loud `::notice` + step-summary line saying the evals did NOT run; the thumbs flow self-skips green |
| `NEXT_PUBLIC_POSTHOG_E2E_TEST_PROJECT_{HOST,CAPTURE_TOKEN}` + `POSTHOG_E2E_TEST_PROJECT_ID` (Actions secrets / local `local-dev/.env.posthog-e2e`) | nightly `Landing-Feedback` job                              | boot the landing (+ mastra) on the shared PostHog e2e project so the feedback/thumbs flows SEND real e2e events      | the whole `Landing-Feedback` job is green with a `::notice` when the capture token is absent                        |
| `POSTHOG_E2E_TEST_PROJECT_QUERY_READ_ONLY_PERSONAL_API_KEY` (Actions secret / local, `query:read` scope)                                           | `ingestion-verification.spec.ts`                            | reads the PostHog Query API to VERIFY this run's events landed (matched by `test_run_id`)                            | the ingestion assertions self-skip green with a loud `::notice`; a present-but-invalid key REDS                     |
| `GOOGLE_CLIENT_ID`/`GOOGLE_CLIENT_SECRET` (local `.env.minio`)                                                                                     | interactive local drive checks                              | optional googleDrive provider on the local e2e harness                                                               | harness runs OAuth-free                                                                                             |
| `VITE_GOOGLE_*`, `VITE_ONEDRIVE_*`, `VITE_DROPBOX_*`, `VITE_BOX_*` (local)                                                                         | storybooks (`cloudDrivesFromEnv`)                           | real sign-in screens in local storybooks                                                                             | empty-string providers still render the sign-in UI                                                                  |
| `UPUP_TEST_{BOX,DROPBOX,GDRIVE,ONEDRIVE}_*` (Actions secrets / local `local-dev/.env.test`)                                                        | nightly `Drive-Sandbox` job + `pnpm run drive:sandbox:test` | live list/folder-nav/search/download byte-integrity for `drive-clients.ts` against disposable sandbox drives         | that provider is skipped green (per-provider); the whole job is green with a `::notice` if none are set             |
| `GH_SECRETS_WRITE_PAT` (Actions secret; fine-grained, repo Secrets: read+write)                                                                    | nightly `Drive-Sandbox` OneDrive rotation step              | persists OneDrive's rotated refresh token back to the secret so it survives to the next run                          | OneDrive is skipped and its stored refresh token is left untouched (never consumed)                                 |

Cloud-drive OAuth (Google/OneDrive/Dropbox/Box) is interactive by design: a
human performs the one-time consent (clicking "Allow" in their own browser);
we never automate or type credentials into a provider login. The real-provider
**sandbox harness now exists** and is opt-in: dedicated disposable sandbox
accounts + OAuth apps, a refresh token minted once via
`scripts/drive-sandbox/mint.mjs` (redirect URI `http://localhost:53682/callback`),
fixtures seeded by `scripts/drive-sandbox/seed.mjs`, and the live suite run
nightly behind per-provider secrets with the skip-loudly-when-absent pattern.
Box uses a Client Credentials service account (no refresh token); OneDrive's
refresh token rotates and is written back each night (needs `GH_SECRETS_WRITE_PAT`).
The sandbox accounts are created by the maintainer — never from production.
Full walkthrough: `docs/drive-sandbox-setup.md`.

## Landing feedback e2e + shared PostHog E2E project

`apps/e2e-test/landing/` drives the landing app's feedback surfaces end to end
and — unlike a "the POST returned 200" check — proves the analytics **actually
ingested**. It talks to `#Shared_Apps_E2E_Testing` (one PostHog project shared
by all Devino apps' automated tests; synthetic data only, never production).

- **Runtime isolation.** The landing (`dataset.ts`) and mastra
  (`observability.ts`) dataset boundaries hard-enforce that the `e2e` dataset
  uses only its own project's capture creds (never a production fallback) and
  that the read-only query key never rides a `production`/`disabled` runtime —
  either violation throws by name. Unit-covered in
  `apps/landing/tests/analytics-isolation.test.ts` and
  `apps/mastra/src/lib/observability.test.ts`.
- **Correlation channel (`e2e` dataset only).** Each run mints a
  `test_run_id` shaped `e2e:<timestamp>-<random>`; the spec seeds
  `localStorage['upup:e2e-test-context']` (`{testRunId, testScenario}`) via
  `addInitScript`. The browser registers `app_id`/`environment`/`test_run_id`/
  `test_scenario` as PostHog super-properties; the /support route accepts
  optional `testRunId`/`testScenario` body fields (`[A-Za-z0-9:_-]{1,100}`) and
  merges them into the captured event ONLY on the `e2e` dataset. Synthetic
  identity convention: `distinct_id = e2e:upup-landing:<test-run-id>:<scenario>`.
- **Specs.** `support-flow.spec.ts` (happy path, reply-guard, double-submit,
  forced-502 retry with same feedbackId), `thumbs-flow.spec.ts` (live Mastra on
  :4144 — needs `OPENROUTER_API_KEY`, self-skips green otherwise), and
  `ingestion-verification.spec.ts` (runs LAST via a project dependency; bounded
  `expect.poll` against the Query API, filtered by this run's `test_run_id`).
- **Gating.** Absent capture token → the whole nightly `Landing-Feedback` job
  skips green with a `::notice`. Absent query key → the ingestion assertions
  self-skip green; a present-but-invalid key REDS (a real POST is never proof —
  only the query result is). Env names live in `local-dev/.env.posthog-e2e.example`.
- **Run:** `pnpm run e2e:landing` (loads `local-dev/.env.posthog-e2e`).

## Debugging Playwright failures

- Nightly uploads `playwright-report/` + `test-results/` artifacts on failure;
  locally, `pnpm --filter @upupjs/e2e-test exec playwright show-report`.
- Traces are `on-first-retry`; view with
  `pnpm --filter @upupjs/e2e-test exec playwright show-trace <trace.zip>`.
- On this repo's primary dev box, run Playwright through `rtk proxy` and trust
  only raw exit codes (see CLAUDE.md "Machine-local notes").
- Flakes: re-run the failing test isolated before suspecting your change
  (CLAUDE.md "Flake protocol"); cross-framework storybook boot is legitimately
  slow (420 s webServer timeout) — don't kill it.
