# @useupup/preact

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
