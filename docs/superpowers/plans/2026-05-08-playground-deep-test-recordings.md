# Playground Deep Test Recordings TODO

Status: TODO source of truth for converting the remaining manual/deep playground passes into Playwright e2e tests.

This file covers the gaps left after `apps/playground/e2e/playground-deep.spec.ts`. Each recording is written as a deterministic browser script: set controls in the playground, perform the user action, capture screenshots, and assert DOM/network/event-log state.

## Baseline Already Covered

- Playground shell, preview, code tab, source controls.
- Generated code for every sidebar category.
- Local file selection, text preview, image preview.
- Default source panels and mocked client cloud source panels.
- Folder controls visibility, accept filter, editor button visibility, event log basics.
- Upload success, checksum metadata, image pipeline metadata, retry after presign failure.
- Arabic RTL, theme mode, message overrides.
- Local-only selected `File` objects with no upload target.
- Deduplication, type/size validation errors.
- Auto-upload, mini mode, preview off, branding off, done reset.
- Drag/drop and paste.
- URL source fetch and mock-object URL source fetch.
- External Tus happy path.
- SSE processing happy path.
- Mocked server-mode Google Drive list/select/transfer.
- Theme slot overrides.
- Camera, microphone, screen source happy paths.
- Crash recovery reload with IndexedDB restore, explicit resume, and recovery cleanup.
- Package smoke consumer for packed `@upup/core`, `@upup/server`, and `@upup/react` tarballs.
- One mobile 390x844 local upload pass.

## Recording Rules

- Use `pnpm --filter @upup/playground test:e2e -- --headed --trace on --video on` when turning a recipe into an e2e recording.
- Attach screenshots after every state transition named in the recipe.
- Assert the browser console has no unexpected `console.error`, page errors, or failed requests.
- Prefer deterministic playground mock routes over live credentials unless a recipe is explicitly marked live-gated.
- Store new automated specs in `apps/playground/e2e/playground-deep.spec.ts` until the file becomes too large; then split by area.

## TODO Matrix

| ID | Area | Status | Target |
|---|---|---:|---|
| REC-01 | Real storage provider smoke | TODO | Live-gated release smoke plus deterministic MinIO/local S3-compatible e2e. |
| REC-02 | Signed upload headers | DONE | Presign returns `uploadHeaders`; browser PUT sends them. |
| REC-03 | Multipart threshold/chunking | DONE | Large file chooses multipart and sends all parts. |
| REC-04 | Multipart pause/resume/cancel | DONE | Visible controls and network pause/resume/cancel behavior. |
| REC-05 | Multipart failed-part retry | DONE | Failed part retries within `maxRetries` and succeeds visibly. |
| REC-06 | Crash recovery reload | DONE | IndexedDB queue/session survives reload and resumes. |
| REC-07 | Concurrent upload cap | DONE | Multiple slow files never exceed `maxConcurrentUploads`. |
| REC-08 | Speed and ETA | PARTIAL | Long upload renders progress/byte totals; explicit ETA assertion still needed. |
| REC-09 | Folder upload payloads | DONE | Nested folder selection preserves `relativePath`. |
| REC-10 | Dangerous CORS config | PARTIAL | Generated config is covered; runtime adapter call still needs a constrained mock assertion. |
| REC-11 | Client cloud OAuth | PARTIAL | Client cloud panels/config are covered; OAuth/list/select remains live/mock-gated. |
| REC-12 | Server cloud providers | PARTIAL | Server Google Drive mock is covered; OneDrive/Dropbox/Box still need provider mocks. |
| REC-13 | Server drive auth failures | TODO | Expired/missing token shows retry/reauth UI and recovers. |
| REC-14 | Server drive navigation/search | TODO | Folder navigation, back, search, pagination/cursor behavior. |
| REC-15 | URL source hard failures | PARTIAL | 404, no content type, and filename sanitization covered; network abort still needed. |
| REC-16 | SSE failure/timeout | PARTIAL | Timeout surfaces `onError`; explicit stream-error branch still needed. |
| REC-17 | Real HEIC conversion | TODO | Real HEIC/HEIF fixture converts to JPEG and uploads transformed file. |
| REC-18 | Compression dimensions/quality | PARTIAL | Pipeline metadata covered; real blob size/type/dimension assertions still needed. |
| REC-19 | Image editor save/apply | PARTIAL | Modal lazy-load/dismiss covered; crop/rotate/save replacement still needed. |
| REC-20 | Accessibility/keyboard | TODO | Keyboard-only flows and axe pass for panels/modals/RTL/mobile. |
| REC-21 | Visual baselines | PARTIAL | Screenshots are attached across flows; reviewed visual snapshots still needed. |
| REC-22 | Package smoke consumer | DONE | Packed `@upup/core`, `@upup/server`, `@upup/react` install/typecheck/build. |
| REC-23 | SSR hydration smoke | TODO | Production SSR app hydrates uploader without mismatch. |
| REC-24 | Mobile breadth | PARTIAL | 320px, landscape, tablet, RTL/source/retry covered; editor panel still needed. |
| REC-25 | Less-traveled props | PARTIAL | `disableDragDrop`, `style`, `metadata`, `onWarn` generation covered; icons and pause/resume/cancel events still needed. |
| REC-26 | Live Mastra assistant | TODO | Optional live Mastra route applies schema-valid patches. |

## Recording Recipes

### REC-01 Real Storage Provider Smoke

Coverage target: prove at least one real S3-compatible provider path works outside the mock object route.

Setup:
- Deterministic e2e: mount a local S3-compatible test backend or MinIO adapter behind `/api/upup-test-storage`.
- Live-gated release smoke: provide bucket credentials through env and use `apps/playground/src/app/api/upup/[...path]/route.ts`.

Steps:
1. Open `/`.
2. Set Advanced mode to `server`.
3. Set Server URL to `/api/upup-test-storage` for deterministic e2e, or `/api/upup` for live smoke.
4. Select a text file named `real-storage-smoke.txt`.
5. Click Upload.

Assertions:
- Root reaches `data-state="successful"`.
- Network includes server presign/transfer and storage PUT/complete calls.
- Returned file URL is durable or clearly marked as signed download URL.
- Screenshot: `rec-01-real-storage-success`.

### REC-02 Signed Upload Headers

Coverage target: ensure `uploadHeaders` returned by presign are sent with browser uploads.

Mock requirement:
- Extend `/api/upup-mock/presign?headers=1` to return `uploadHeaders: { "x-upup-test-header": "signed-value" }`.
- Extend object PUT route to reject when the header is missing.

Steps:
1. Open `/?mockRun=rec-02&mockHeaders=1`.
2. Select `signed-headers.txt`.
3. Click Upload.

Assertions:
- PUT request contains `x-upup-test-header: signed-value`.
- Object route returns 200 only with the header.
- Root reaches successful.
- Screenshot: `rec-02-signed-headers-success`.

### REC-03 Multipart Threshold/Chunking

Coverage target: prove large files choose multipart and all parts are uploaded.

Mock requirement:
- Add deterministic multipart mock endpoints: create, sign part, upload part, complete, abort.
- Expose a test log endpoint containing `create`, `partNumbers`, `complete`.

Steps:
1. Open `/?mockRun=rec-03`.
2. Set Upload `resumable.protocol` to `multipart`.
3. Set chunk size to `256 KB`.
4. Select a 1 MB generated file.
5. Click Upload.

Assertions:
- Multipart create called once.
- Four part upload calls happen with ordered part numbers.
- Complete called once with all ETags.
- No direct mock object PUT is used.
- Screenshot: `rec-03-multipart-complete`.

### REC-04 Multipart Pause/Resume/Cancel

Coverage target: visible controls control an active upload without stale state.

Mock requirement:
- Slow multipart part route with controllable latency.

Steps:
1. Open `/?mockRun=rec-04&mockSlowParts=1`.
2. Enable multipart with small chunks.
3. Select a 2 MB generated file.
4. Click Upload.
5. Click Pause while at least one part is in flight.
6. Wait and confirm no new part requests start.
7. Click Resume.
8. Confirm upload continues.
9. Repeat with a second file and click Cancel.

Assertions:
- Root or file status becomes paused, then ongoing, then successful.
- Cancel aborts in-flight requests and clears/reconciles stale progress.
- Events tab records `onPause`, `onResume`, and `onCancel` once those callbacks are exposed in playground.
- Screenshots: `rec-04-paused`, `rec-04-resumed`, `rec-04-cancelled`.

### REC-05 Multipart Failed-Part Retry

Coverage target: failed chunks retry under `maxRetries`, then succeed.

Mock requirement:
- Part route fails part 2 once, then succeeds for the same upload id.

Steps:
1. Open `/?mockRun=rec-05&mockPartFailure=once`.
2. Set `Max retries` to `2`.
3. Enable multipart with small chunks.
4. Select a 1 MB generated file.
5. Click Upload.

Assertions:
- Part 2 returns `503`, then successful retry.
- File/root never ends failed.
- Event log includes upload progress after retry.
- Screenshot: `rec-05-part-retry-success`.

### REC-06 Crash Recovery Reload

Coverage target: persisted queue/session recovers after reload.

Mock requirement:
- Slow upload route that can hold progress across a reload.

Steps:
1. Open `/?mockRun=rec-06&mockSlowUpload=1`.
2. Enable `Crash recovery (IndexedDB)`.
3. Select a 1 MB file.
4. Click Upload.
5. Wait for ongoing state.
6. Reload the page.
7. Confirm previous file/session rehydrates.
8. Resume upload explicitly and allow it to complete.

Assertions:
- IndexedDB contains the recovery record before reload.
- File appears after reload without reselecting.
- Restored uploader enters paused state with a visible resume action.
- Upload reaches successful after resume and clears the recovery record.
- Screenshots: `crash-recovery-before-reload`, `crash-recovery-restored-paused`, `crash-recovery-resumed-success`.

### REC-07 Concurrent Upload Cap

Coverage target: queue respects `maxConcurrentUploads`.

Mock requirement:
- Slow object PUT route that records active request count.

Steps:
1. Open `/?mockRun=rec-07&mockSlowObject=1`.
2. Set `Max concurrent uploads` to `2`.
3. Select five generated files.
4. Click Upload.

Assertions:
- At most two PUTs are active at any time.
- Event log eventually records all five completions.
- Root reaches successful.
- Screenshot: `rec-07-concurrency-success`.

### REC-08 Speed and ETA

Coverage target: progress UI derives speed and ETA from core progress events.

Mock requirement:
- Throttled PUT route that streams progress over at least two seconds.

Steps:
1. Open `/?mockRun=rec-08&mockThrottle=1`.
2. Select a 2 MB file.
3. Click Upload.
4. Observe progress while ongoing.

Assertions:
- File row shows nonzero progress.
- Speed and ETA text, if exposed, become nonempty during upload and clear/settle on success.
- Event log includes concrete loaded/total/percentage values.
- Screenshot: `rec-08-speed-eta-ongoing`.

### REC-09 Folder Upload Payloads

Coverage target: nested folder selection preserves relative paths.

Mock requirement:
- Add a browser-side folder fixture helper using `webkitRelativePath` and/or mocked DataTransfer entries.

Steps:
1. Open `/`.
2. Enable Sources `Folder upload.Allow folders`.
3. Enable Sources `Folder upload.Show folder button`.
4. Select or drop files:
   - `photos/2026/a.jpg`
   - `photos/2026/b.jpg`
   - `docs/readme.txt`
5. Upload.

Assertions:
- File list shows all files.
- Presign bodies include relative path metadata.
- Object keys preserve or intentionally normalize folder structure.
- Screenshot: `rec-09-folder-payloads`.

### REC-10 Dangerous CORS Config

Coverage target: dangerous CORS config is explicit, constrained, and adapter-driven.

Mock requirement:
- Add a core/server mock adapter that records a CORS mutation request but does not touch live storage.

Steps:
1. Open `/`.
2. Advanced CORS: enable `Dangerously auto-configure`.
3. Set allowed origins to `http://localhost:3000`.
4. Generate code.
5. Trigger the runtime setup path if exposed by the playground.

Assertions:
- Generated code contains `cors={{ dangerouslyAutoConfigure: true, allowedOrigins: [...] }}`.
- Runtime adapter receives only explicit allowed origins.
- No wildcard origin appears unless intentionally set.
- Screenshot: `rec-10-cors-code`.

### REC-11 Client Cloud OAuth

Coverage target: browser-owned cloud providers list/select files in client mode.

Live-gated:
- Requires provider app credentials and OAuth test accounts.

Steps per provider:
1. Open `/`.
2. Keep mode `client`.
3. Set the provider client id/config in Advanced.
4. Enable the provider source tile.
5. Click provider source.
6. Complete OAuth/picker flow.
7. Select a tiny fixture file.
8. Confirm it queues and can upload through mock storage.

Assertions:
- No raw tokens appear in visible UI/logs.
- Provider list renders files/folders.
- Selected file enters core state and can upload.
- Screenshots: `rec-11-client-google`, `rec-11-client-onedrive`, `rec-11-client-dropbox`, `rec-11-client-box`.

### REC-12 Server Cloud Providers

Coverage target: server mode works for OneDrive, Dropbox, and Box, not only Google.

Mock requirement:
- Extend server mock route interception to all providers.

Steps per provider:
1. Open `/`.
2. Set Advanced mode to `server`.
3. Set Server URL to `/api/upup-server-mock`.
4. Seed provider client id/config.
5. Enable provider source.
6. Open source, select fixture file, click Add files.

Assertions:
- Browser calls `/files/:provider`.
- Transfer POST body includes id, name, size, MIME.
- Queued file appears after transfer.
- Screenshots: `rec-12-server-onedrive`, `rec-12-server-dropbox`, `rec-12-server-box`.

### REC-13 Server Drive Auth Failures

Coverage target: expired/missing server tokens surface retry/reauth UI.

Mock requirement:
- Provider list returns `401` once, then success after retry/seed.

Steps:
1. Open `/`.
2. Set server mode and mock server URL.
3. Open Dropbox source with expired-token scenario.
4. Click the visible sign-in/retry action.
5. Fulfill the retry path.

Assertions:
- Auth fallback is visible after 401.
- Retry does not spam list requests.
- Successful retry lists files.
- Screenshot: `rec-13-server-reauth`.

### REC-14 Server Drive Navigation/Search

Coverage target: folder navigation, back, search, and pagination/cursor state.

Mock requirement:
- Fixture folder tree with at least two pages.

Steps:
1. Open server-mode Google Drive mock.
2. Enter folder `Finance`.
3. Search for `report`.
4. Load next page.
5. Navigate back.

Assertions:
- Query params/body include folder id, search term, cursor.
- Breadcrumb/back button restores previous list.
- Selection remains correct after pagination.
- Screenshot: `rec-14-server-drive-navigation`.

### REC-15 URL Source Hard Failures

Coverage target: URL source failures are visible and safe.

Scenarios:
- 404 response.
- 200 without `Content-Type`.
- URL ending in unsafe filename characters.
- Request abort/network failure.

Steps:
1. Open `/`.
2. Open Link source.
3. Fill each fixture URL and click Fetch.

Assertions:
- `response.ok` failures do not queue a file.
- Missing content type falls back safely.
- Filename is sanitized.
- Event log includes `onError` for true failures.
- Screenshots: `rec-15-url-404`, `rec-15-url-filename`.

### REC-16 SSE Failure/Timeout

Coverage target: post-upload processing failures are surfaced.

Mock requirement:
- `/api/upup-mock/processing?fail=1` returns 500 or malformed SSE.
- `/api/upup-mock/processing?hang=1` never emits before timeout.

Steps:
1. Open `/?mockRun=rec-16`.
2. Set Processing endpoint to failing route.
3. Set Processing timeout to 1000.
4. Enable `onFileProcessed` and `onError`.
5. Upload a text file.

Assertions:
- Upload success and processing failure are distinguishable.
- Error UI/event log does not mark file fully processed.
- Timeout path is deterministic.
- Screenshot: `rec-16-sse-timeout`.

### REC-17 Real HEIC Conversion

Coverage target: HEIC/HEIF input converts to JPEG.

Fixture requirement:
- Add a tiny permissively licensed HEIC fixture under a test fixture folder.

Steps:
1. Open `/`.
2. Enable Processing `HEIC -> JPEG conversion`.
3. Select `fixture.heic`.
4. Upload.

Assertions:
- Queued/uploaded file has JPEG MIME or transformed output metadata.
- Presign body reflects transformed name/type/size.
- Preview is renderable after conversion.
- Screenshot: `rec-17-heic-converted-preview`.

### REC-18 Compression Dimensions/Quality

Coverage target: compression changes real image output according to config.

Fixture requirement:
- Add a large PNG/JPEG fixture with known dimensions.

Steps:
1. Open `/`.
2. Enable Processing `Compress images`.
3. Select the large image.
4. Upload.

Assertions:
- Processed size is smaller than original for the fixture.
- Output MIME matches expected compression format.
- Preview still renders.
- Presign metadata includes original/processed size.
- Screenshot: `rec-18-compressed-preview`.

### REC-19 Image Editor Save/Apply

Coverage target: editing changes the queued file and upload payload.

Steps:
1. Open `/`.
2. Enable image editor.
3. Set display `modal`.
4. Set auto-open `When 1 image is added`.
5. Select an image.
6. Crop or rotate.
7. Save/apply.
8. Upload.

Assertions:
- Dialog closes after save.
- File preview changes or metadata marks edited output.
- Presign body size/name/type matches edited blob.
- Screenshot: `rec-19-editor-saved`.

### REC-20 Accessibility/Keyboard

Coverage target: keyboard and axe pass on real playground states.

States:
- Empty uploader.
- File list with upload controls.
- URL source panel.
- Image editor modal.
- Server drive browser.
- Arabic RTL.
- Mobile 390px.

Steps:
1. For each state, navigate using Tab/Shift+Tab/Enter/Escape only.
2. Run axe or equivalent accessibility assertions.

Assertions:
- No keyboard trap except intentional modal focus trap.
- Focus returns after closing panels/modals.
- Buttons have accessible names.
- Screenshot: `rec-20-a11y-state-name`.

### REC-21 Visual Baselines

Coverage target: screenshots become reviewed visual snapshots, not only attachments.

States:
- Desktop empty, selected, uploading, success, failed.
- Dark mode.
- Arabic RTL.
- Server drive browser.
- Image editor modal.
- Mobile 320, 390, tablet, landscape.

Assertions:
- No overlapping controls.
- No clipped button text.
- No horizontal overflow.
- Snapshot diffs are reviewed with a small threshold.

### REC-22 Package Smoke Consumer

Coverage target: published package shape works without workspace links.

Steps:
1. Run `pnpm run smoke:packages`.
2. The script runs package builds.
3. The script packs `@upup/core`, `@upup/server`, `@upup/react`.
4. The script installs tarballs into a temp Vite consumer without workspace links.
5. The script typechecks imports:
   - `@upup/core`
   - `@upup/core/i18n`
   - `@upup/core/theme`
   - `@upup/server`
   - `@upup/server/next`
   - `@upup/react`
   - `@upup/react/styles`

Assertions:
- Packed package manifests do not contain `workspace:` dependencies.
- Consumer lockfile does not contain `workspace:` dependencies.
- Consumer typecheck passes.
- Consumer production build passes.

### REC-23 SSR Hydration Smoke

Coverage target: production SSR/hydration works.

Steps:
1. Build playground or a temp Next consumer.
2. Start production server.
3. Open page.
4. Watch console during hydration.
5. Select and upload a mock file.

Assertions:
- No hydration mismatch warnings.
- Uploader remains interactive after hydration.
- Screenshot: `rec-23-ssr-hydrated-upload`.

### REC-24 Mobile Breadth

Coverage target: mobile layouts beyond one happy path.

Viewports:
- 320x568.
- 390x844.
- 844x390 landscape.
- 768x1024 tablet.

States:
- Empty.
- File selected.
- Upload failed/retry.
- URL source.
- Arabic RTL.
- Editor modal.

Assertions:
- No horizontal overflow above 2px.
- Buttons and labels do not clip.
- Modals fit and close.
- Screenshots: `rec-24-mobile-{viewport}-{state}`.

### REC-25 Less-Traveled Props

Coverage target: props that are public but not deeply browser-covered.

Scenarios:
- `disableDragDrop`: drag events do not add files and UI communicates disabled state, or remove the prop if intentionally unsupported.
- `icons`: custom icon renders in source/upload/delete controls.
- `style`: inline root style applies without breaking tokens.
- `metadata`: arbitrary metadata reaches presign/server payload.
- `onWarn`: deterministic warning appears in Event Log.
- Pause/resume/cancel events: callbacks fire during long upload.

Assertions:
- Generated code includes the prop when configured by playground.
- Runtime behavior matches generated code.
- Screenshots: `rec-25-{prop-name}`.

### REC-26 Live Mastra Assistant

Coverage target: optional live assistant path matches schema and codegen.

Live-gated:
- Requires Mastra service URL and agent id.

Steps:
1. Open playground with live Mastra config.
2. Ask for a concrete patch: "Make uploads server mode, Arabic, dark, image-only, max 2 files".
3. Apply response.
4. Verify sidebar, preview, and generated code.

Assertions:
- Patch is schema-valid.
- No stale API names are generated.
- Preview state and code tab match the patch.
- Screenshot: `rec-26-mastra-live-patch`.

## First Automation Batch

Implement these first because they do not require live third-party credentials:

1. REC-02 signed upload headers.
2. REC-03 multipart threshold/chunking.
3. REC-05 multipart failed-part retry.
4. REC-07 concurrent upload cap.
5. REC-09 folder upload payloads.
6. REC-15 URL source hard failures.
7. REC-16 SSE failure/timeout.
8. REC-24 mobile breadth.
9. REC-25 metadata/onWarn/style/icons/disableDragDrop triage.

## Live-Gated Batch

Run before a release candidate, not on every CI run:

1. REC-01 live storage provider smoke.
2. REC-11 client cloud OAuth.
3. REC-26 live Mastra assistant.
