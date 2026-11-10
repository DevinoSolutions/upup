# @useupup/preact

## 3.4.0

### Minor Changes

- [#693](https://github.com/DevinoSolutions/upup/pull/693) [`eb4fadf`](https://github.com/DevinoSolutions/upup/commit/eb4fadfd8090f6f780fda5d93f9bee6410dea957) Thanks [@AminDhouib](https://github.com/AminDhouib)! - A refused file is now reported with the reason core gave it, once, and no longer costs the rest of its batch.

    - `onRestrictionFailed` receives `UpupValidationError.reason` instead of a reason guessed from the message text, so a file named `Unlimited_CV.pdf` that is too large reports `FILE_TOO_LARGE` (not `LIMIT_EXCEEDED`) and an over-total batch reports the new `'TOTAL_SIZE_EXCEEDED'` (previously `FILE_TOO_LARGE`). `onFileTypeMismatch`, `onRestrictionFailed` and `onError` fire once per refused file, each with that file. **That means `onError` now fires once per refused file**: a drop of three refused files calls `onError` three times with three messages (an app that shows a toast per call shows three toasts), where it used to fire once for the whole batch.
    - `core.setFiles()` now emits `restriction-failed` for a refusal, and `core.addFiles()` / `core.setFiles()` emit it for refusals only: an ordinary error (a throwing `onBeforeFileAdded`) no longer masquerades as a restriction failure.
    - One failed upload calls `onError` once. The batch summary that follows the per-file error ("1 file upload(s) failed") no longer reaches `onError` when every file in it was already reported. The raw `upload-error` event keeps its documented two emissions.
    - Refusals are reported the same way on every route that admits files: the picker and drop, the `uploadFiles` and `replaceFiles` ref commands, and the re-add that follows `onPrepareFiles`. `uploadFiles` uploads the acceptable files and reports each refused one; `replaceFiles` keeps the current selection and its previews when every file is refused. `core.setFiles()` takes the same optional `hooks` argument as `addFiles()`, and a host callback that throws inside `hooks.onRefused` no longer rejects an add that already committed files (it is warned about in development and the remaining refusals are still reported).
    - A mixed batch (say `.zip`, `.exe` and a valid `.png` dropped together) queues the acceptable files and reports each refused one separately, in `addFiles` and `setFiles` alike. Type and size are judged per file; the count limit and `maxTotalFileSize` still judge the acceptable remainder as a unit, exactly as before. `addFiles` / `setFiles` still reject, with the first refusal, when **every** file in the batch is refused; a batch with at least one acceptable file now resolves instead of rejecting.

    This is a minor, not a major: no export, option or event was removed, and the one observable change (a partly acceptable batch now resolves) fixes a whole-batch rejection that dropped valid files. The `onRestrictionFailed` reason union gains `'TOTAL_SIZE_EXCEEDED'`, `UpupCore.addFiles` takes an optional third `hooks` argument (`{ onRefused }`) and `UpupCore.setFiles` an optional second one, and the `AddFilesHooks` type is exported from `@useupup/core`.

    One type-level consequence worth knowing: an app that annotates the `onRestrictionFailed` callback's `reason` parameter with the old four-value union (`'TYPE_MISMATCH' | 'FILE_TOO_LARGE' | 'FILE_TOO_SMALL' | 'LIMIT_EXCEEDED'`) now gets a type error under `strictFunctionTypes`, because the callback can receive `'TOTAL_SIZE_EXCEEDED'`. Widen the annotation (or drop it and let it infer) to fix it.

- [#535](https://github.com/DevinoSolutions/upup/pull/535) [`ed926a1`](https://github.com/DevinoSolutions/upup/commit/ed926a17b31f63f4fb221d3b35ad03732bd004a7) Thanks [@jayasuryapazhani](https://github.com/jayasuryapazhani)! - Expose `retryUpload(fileId?)` through `UploaderRef.useUpload()` so host applications can retry failed file uploads.

### Patch Changes

- [#566](https://github.com/DevinoSolutions/upup/pull/566) [`abfc47d`](https://github.com/DevinoSolutions/upup/commit/abfc47dbf37671bea5b330d7c84e66eac9c13b7a) Thanks [@AminDhouib](https://github.com/AminDhouib)! - The "Built by Devino" wordmark in the uploader footer is no longer squashed
  horizontally: it renders in a 43x13 box that matches the artwork's aspect ratio
  instead of 61x13 (#401).

- [#602](https://github.com/DevinoSolutions/upup/pull/602) [`a26732a`](https://github.com/DevinoSolutions/upup/commit/a26732ae8d5835c6d25ecebdf4a96c960319b0ac) Thanks [@AminDhouib](https://github.com/AminDhouib)! - Calmer, reduced-motion-safe uploader motion. The add-more overlay slides in
  250ms (was 350ms), and core's overlay close timer follows it, so the closing
  overlay unmounts as soon as its slide ends; the success check draws in 300ms (was 400ms); the success
  pop no longer overshoots; the recording dot pulses by opacity only; hover
  effects (lift, icon nudge, button sheen, remove tint) only apply on devices that
  really hover, the button sheen sweeps in 150ms, the remove button no longer
  rotates, and the lift no longer tweens its shadow. With `animations={false}` or
  `prefers-reduced-motion: reduce`, transitions, the pulsing record and
  drive-loading buttons and the progress-bar width tween are now off too (the bar
  still shows its value), while loading spinners keep spinning. No new, renamed or removed classes, tokens,
  props or markup; only existing token values and the keyframe and transition rules behind them changed.

- [#662](https://github.com/DevinoSolutions/upup/pull/662) [`8527750`](https://github.com/DevinoSolutions/upup/commit/85277507e78678c5df100ab5fa18ac9f4c4a7bae) Thanks [@AminDhouib](https://github.com/AminDhouib)! - The add-more sheet now takes focus itself (it carries `tabindex="-1"`) when it has no enabled control, so keyboard and screen-reader users no longer stay on the inert list behind it. The sheet also reserves space under its drag grip (`upup-pt-8`), so the grip no longer draws over the end of a source view's header title on narrow widths.

- [#660](https://github.com/DevinoSolutions/upup/pull/660) [`ceec02f`](https://github.com/DevinoSolutions/upup/commit/ceec02f6126ab69b6e21a38438e608ede4683793) Thanks [@AminDhouib](https://github.com/AminDhouib)! - Opening the add-more sheet or a source view no longer moves keyboard focus onto the decorative top-center sheet grip. The focus-on-open lookup picked the first enabled button in the sheet, which is the grip, so its focus ring was drawn over the view title (for example "Google Drive" at mobile width). The grip is now skipped and focus lands on the first real control; the grip itself stays keyboard-reachable.

- Updated dependencies [[`ff775a4`](https://github.com/DevinoSolutions/upup/commit/ff775a421c8b35bc244f4bea76346557bff4d884), [`abfc47d`](https://github.com/DevinoSolutions/upup/commit/abfc47dbf37671bea5b330d7c84e66eac9c13b7a), [`6138e55`](https://github.com/DevinoSolutions/upup/commit/6138e55e79901c2a1ae2ec0d39b5f1d66fb54c78), [`a26732a`](https://github.com/DevinoSolutions/upup/commit/a26732ae8d5835c6d25ecebdf4a96c960319b0ac), [`4aa7b00`](https://github.com/DevinoSolutions/upup/commit/4aa7b00425dafea763dea0eabb84884f89b7e323), [`023276e`](https://github.com/DevinoSolutions/upup/commit/023276e205bd094c44871b3ef6a91191c6bc46a7), [`eb4fadf`](https://github.com/DevinoSolutions/upup/commit/eb4fadfd8090f6f780fda5d93f9bee6410dea957), [`ed926a1`](https://github.com/DevinoSolutions/upup/commit/ed926a17b31f63f4fb221d3b35ad03732bd004a7), [`c20db76`](https://github.com/DevinoSolutions/upup/commit/c20db7659e639a7ff50cca0eee010daaa560455c), [`b43d7e1`](https://github.com/DevinoSolutions/upup/commit/b43d7e10ca65a4baf3c150b1a4c2c94989cb4f95), [`8527750`](https://github.com/DevinoSolutions/upup/commit/85277507e78678c5df100ab5fa18ac9f4c4a7bae), [`ceec02f`](https://github.com/DevinoSolutions/upup/commit/ceec02f6126ab69b6e21a38438e608ede4683793)]:
    - @useupup/core@3.4.0
    - @useupup/react@3.4.0

## 3.3.5

### Patch Changes

- Updated dependencies []:
    - @useupup/core@3.3.5
    - @useupup/react@3.3.5

## 3.3.4

### Patch Changes

- [#472](https://github.com/DevinoSolutions/upup/pull/472) [`900a560`](https://github.com/DevinoSolutions/upup/commit/900a5605e269d15df1a1fa2a2c921f351c44e888) Thanks [@AminDhouib](https://github.com/AminDhouib)! - Image editor menus now open on top of the editor. Filerobot's menus (watermark
  type, zoom, font and colour pickers) are portalled to `<body>` at z-index 1300,
  which put them underneath the inline editor (z-9999) and the modal editor
  (z-2147483647). Clicking "Add watermark" or the zoom control appeared to do
  nothing, because the menu opened out of sight. The editor's style overrides now
  lift those menus to the top layer.
- Updated dependencies [[`4f9324d`](https://github.com/DevinoSolutions/upup/commit/4f9324d9ee3c63238b0d9478fa21110ad390b734), [`900a560`](https://github.com/DevinoSolutions/upup/commit/900a5605e269d15df1a1fa2a2c921f351c44e888)]:
    - @useupup/core@3.3.4
    - @useupup/react@3.3.4

## 3.3.3

### Patch Changes

- Updated dependencies [[`bf817fc`](https://github.com/DevinoSolutions/upup/commit/bf817fc1bf57b56cc4ca7e6e11209a6ab4429f4d)]:
    - @useupup/core@3.3.3
    - @useupup/react@3.3.3

## 3.3.2

### Patch Changes

- Updated dependencies [[`5921da4`](https://github.com/DevinoSolutions/upup/commit/5921da4d1c3094d76fbbd0f5deee7a1c5e7efbe9)]:
    - @useupup/core@3.3.2
    - @useupup/react@3.3.2

## 3.3.1

### Patch Changes

- [#398](https://github.com/DevinoSolutions/upup/pull/398) [`32ae800`](https://github.com/DevinoSolutions/upup/commit/32ae80094b21ea7064a5061d14d652b0e8bc7d82) Thanks [@AminDhouib](https://github.com/AminDhouib)! - The compact file row shows its progress bar as soon as a run starts (#352), and
  the branding logo assets are ~92% smaller (#229).

    `ProgressBar` already renders whenever the run is active or progress is
    non-zero, but every framework's compact `FileRow` wrapped it in a second
    `!!progress` gate. That outer gate won whenever it was falsy, so the row stayed
    blank between "upload started" and "first byte acknowledged" while the grid
    tile, the single-file hero and the list footer all showed their bars. The
    redundant wrapper is removed in all five row templates; the self-gate inside
    `ProgressBar` is now the only one. No change at idle — with no progress and no
    active run the bar is still absent, so the parity fixtures do not move.

    The four base64 PNG logo assets in `src/assets/logos.ts` are re-exported at
    122x26, twice the fixed 61x13 CSS-pixel box every framework renders them in.
    They were shipping at up to 1905x580 — roughly 30x the rendered area. Each
    package's copy of that file drops from 167 KB to 13 KB, about 109 KB gzipped off
    every UI bundle, with the rendered appearance unchanged. The assets stay PNG:
    there is no vector source for them in the repo.

- Updated dependencies [[`7df75e6`](https://github.com/DevinoSolutions/upup/commit/7df75e6b430e080bf8f3931297ec171d86ff19ce), [`e4393b5`](https://github.com/DevinoSolutions/upup/commit/e4393b5652add229c9d5fa849cba2ba97913f7cf), [`db9ea90`](https://github.com/DevinoSolutions/upup/commit/db9ea90af5b1916763d607baee81e118b6d7c718), [`720d273`](https://github.com/DevinoSolutions/upup/commit/720d2735d268b242338b70afa380161cf7107036), [`32ae800`](https://github.com/DevinoSolutions/upup/commit/32ae80094b21ea7064a5061d14d652b0e8bc7d82)]:
    - @useupup/core@3.3.1
    - @useupup/react@3.3.1

## 3.3.0

### Patch Changes

- [#363](https://github.com/DevinoSolutions/upup/pull/363) [`c40ddf5`](https://github.com/DevinoSolutions/upup/commit/c40ddf554b12ecd13fd974452972791928974e84) Thanks [@AminDhouib](https://github.com/AminDhouib)! - Fix `import '@useupup/<framework>/styles'` failing to type-check on TypeScript 6+ (#357).

    Every framework package exported its stylesheet as a bare string (`"./styles": "./dist/tailwind-prefixed.css"`). TypeScript 6 began type-checking side-effect imports, so the documented stylesheet import failed with `TS2882: Cannot find module or type declarations for side-effect import`, forcing consumers to hand-write an ambient `declare module` shim. The `./styles` subpath now carries a `types` condition backed by a generated empty-module declaration (`dist/styles.d.ts`), plus a `typesVersions` fallback so legacy `moduleResolution: "node10"` consumers resolve it too. This is a types-only change: the `default` condition still points at the same unmoved `dist/tailwind-prefixed.css`, so runtime resolution, bundler behavior, and the CSS itself are byte-for-byte unchanged.

- Updated dependencies [[`5fbd2c6`](https://github.com/DevinoSolutions/upup/commit/5fbd2c671a1834cd8e884bda455eb5602480f829), [`8446ca0`](https://github.com/DevinoSolutions/upup/commit/8446ca0c8ad26e2a1704a2d8bd11fc306c434f5d), [`03b4e82`](https://github.com/DevinoSolutions/upup/commit/03b4e82baed0d751ba5da688715ef48748e7fe51), [`c40ddf5`](https://github.com/DevinoSolutions/upup/commit/c40ddf554b12ecd13fd974452972791928974e84)]:
    - @useupup/core@3.3.0
    - @useupup/react@3.3.0

## 3.2.0

### Minor Changes

- [#358](https://github.com/DevinoSolutions/upup/pull/358) [`ff8f74f`](https://github.com/DevinoSolutions/upup/commit/ff8f74fd5cd33525b491267b986d566e3e1d8b5b) Thanks [@BSalaeddin](https://github.com/BSalaeddin)! - Two follow-ups to the multipart hardening round:

    - **`resumable.maxConcurrentParts`** (default `3`): the parts-of-one-file
      concurrency cap is now public on the multipart config. More parts in flight
      buys throughput on high-bandwidth links and costs memory and sockets — each
      in-flight part holds its own chunk. Values below 1 are clamped to 1. This is
      a different axis from `maxConcurrentUploads` (files in parallel); the two
      multiply.
    - **`networkAware` is now a component prop** on every framework port (it was
      headless-only). It remains on by default — passing nothing keeps the
      offline-pauses / online-resumes behavior; `networkAware={false}` opts out.
      Omitting the prop deliberately forwards `undefined` so core's default-on
      applies.

### Patch Changes

- Updated dependencies [[`de8b363`](https://github.com/DevinoSolutions/upup/commit/de8b3635a1eafa04c378a5f5af14e22ba99b3fe5), [`de8b363`](https://github.com/DevinoSolutions/upup/commit/de8b3635a1eafa04c378a5f5af14e22ba99b3fe5), [`ff8f74f`](https://github.com/DevinoSolutions/upup/commit/ff8f74fd5cd33525b491267b986d566e3e1d8b5b), [`da08e45`](https://github.com/DevinoSolutions/upup/commit/da08e45fe49df4824a134b69498dff223b883701), [`5597477`](https://github.com/DevinoSolutions/upup/commit/5597477e29ad970f249b3a6b7b4912495e8a0503)]:
    - @useupup/core@3.2.0
    - @useupup/react@3.2.0

## 3.1.0

### Minor Changes

- [#325](https://github.com/DevinoSolutions/upup/pull/325) [`79a2861`](https://github.com/DevinoSolutions/upup/commit/79a2861ffc6259485075ac54c85c564fd58c7b86) Thanks [@AminDhouib](https://github.com/AminDhouib)! - Redesigned default experience + refined component interface.

    **New default UI (all six frameworks, React-canonical):** a single selected
    file now renders as a `FileHero`; two or more render as a card list; source
    overlays gain a labelled `Back` action; file removal defers ~200ms for a
    smooth exit. A new `upup-fx-*` animation layer ships enabled by default.

    **Interface additions (`<UpupUploader>` props, identical across frameworks):**

    - `animations?: boolean` (default `true`) — decorative motion layer; `false`
      disables it (spinner/progress/focus always stay). Also forced off under
      `prefers-reduced-motion`.
    - `quietCompletion?: boolean` (default `false`) — on success, show only a
      brief checkmark and hand off to the completion callbacks/events (no Done
      button or summary), for apps that own the post-upload flow.
    - `imageEditor` now defaults on (React/Preact only) with a visible edit
      affordance; pass `imageEditor={false}` to opt out.

    **Non-visual:** all packages adopt `exactOptionalPropertyTypes` /
    `noUncheckedIndexedAccess`; `@useupup/server` upload/drive routing is
    decomposed by concern behind a single CORS-safe responder. No breaking
    changes to the existing prop names or event contract — the additions are
    backward-compatible.

### Patch Changes

- [#325](https://github.com/DevinoSolutions/upup/pull/325) [`a51ab7b`](https://github.com/DevinoSolutions/upup/commit/a51ab7bcc9b35d50ec038ad05532abccee9b12b6) Thanks [@AminDhouib](https://github.com/AminDhouib)! - Source-selector chips now size dynamically: with 8 or fewer configured
  sources the larger, roomier chips are used; 9 or more switches to the
  compact set so all sources fit the panel without crowding. Identical
  behavior across all six frameworks.
- Updated dependencies [[`a51ab7b`](https://github.com/DevinoSolutions/upup/commit/a51ab7bcc9b35d50ec038ad05532abccee9b12b6), [`79a2861`](https://github.com/DevinoSolutions/upup/commit/79a2861ffc6259485075ac54c85c564fd58c7b86)]:
    - @useupup/react@3.1.0
    - @useupup/core@3.1.0
