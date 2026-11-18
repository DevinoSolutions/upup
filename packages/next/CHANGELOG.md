# @useupup/next

## 3.4.0

### Minor Changes

- [#643](https://github.com/DevinoSolutions/upup/pull/643) [`7d9fb8f`](https://github.com/DevinoSolutions/upup/commit/7d9fb8fa9736413aee197b49724d015b094efbcb) Thanks [@AminDhouib](https://github.com/AminDhouib)! - Server hardening. `Vary: Origin` is now sent on every response whenever `cors` is configured, including replies to a disallowed or missing origin, so a shared cache cannot hand a header-less reply to an allowed origin. `/multipart/complete` answers 400 (not 500) when `parts` is not an array of `{ partNumber, eTag }`; the check runs after the token checks, so a forged token is still 403. `/presign` and `/multipart/init` now require `size` to be an integer.

### Patch Changes

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

- [#623](https://github.com/DevinoSolutions/upup/pull/623) [`3b67b9d`](https://github.com/DevinoSolutions/upup/commit/3b67b9d8d3bfa3d1f3d9b292b94d8dbc9d55853b) Thanks [@AminDhouib](https://github.com/AminDhouib)! - OAuth and input hardening. The OAuth nonce cookie is now `__Host-upup_oauth_<provider>` (Path=/, Secure, no Domain) over https, so a sibling subdomain cannot toss it; plain http keeps the old name and `/cb` path. `/cb` accepts a match from any same-named cookie, and clears the nonce cookie on every exit, not only success. The Fastify and Next Pages adapters now deliver several `Set-Cookie` headers instead of keeping only the last. A JSON body that is not an object is a 400 instead of a 500, an upload token with extra segments is rejected, the `/health` storage probe cache is per destination, and the token-exchange and refresh calls have a timeout and refuse a response with no `access_token`.

- Updated dependencies [[`ff775a4`](https://github.com/DevinoSolutions/upup/commit/ff775a421c8b35bc244f4bea76346557bff4d884), [`abfc47d`](https://github.com/DevinoSolutions/upup/commit/abfc47dbf37671bea5b330d7c84e66eac9c13b7a), [`852fcec`](https://github.com/DevinoSolutions/upup/commit/852fcec88e97e49e305d6489fd6cf2d7170cc3e5), [`6138e55`](https://github.com/DevinoSolutions/upup/commit/6138e55e79901c2a1ae2ec0d39b5f1d66fb54c78), [`cc4d305`](https://github.com/DevinoSolutions/upup/commit/cc4d30563da38aeb2e259e3b2216421227c95814), [`a26732a`](https://github.com/DevinoSolutions/upup/commit/a26732ae8d5835c6d25ecebdf4a96c960319b0ac), [`4aa7b00`](https://github.com/DevinoSolutions/upup/commit/4aa7b00425dafea763dea0eabb84884f89b7e323), [`81ad969`](https://github.com/DevinoSolutions/upup/commit/81ad969ede8f3c7cc39d26e9829616b7c818c4a1), [`023276e`](https://github.com/DevinoSolutions/upup/commit/023276e205bd094c44871b3ef6a91191c6bc46a7), [`eb4fadf`](https://github.com/DevinoSolutions/upup/commit/eb4fadfd8090f6f780fda5d93f9bee6410dea957), [`ed926a1`](https://github.com/DevinoSolutions/upup/commit/ed926a17b31f63f4fb221d3b35ad03732bd004a7), [`c20db76`](https://github.com/DevinoSolutions/upup/commit/c20db7659e639a7ff50cca0eee010daaa560455c), [`b43d7e1`](https://github.com/DevinoSolutions/upup/commit/b43d7e10ca65a4baf3c150b1a4c2c94989cb4f95), [`3b67b9d`](https://github.com/DevinoSolutions/upup/commit/3b67b9d8d3bfa3d1f3d9b292b94d8dbc9d55853b), [`4b19826`](https://github.com/DevinoSolutions/upup/commit/4b1982686af1aca8a886641b0f38cb6ebf31f421), [`7d9fb8f`](https://github.com/DevinoSolutions/upup/commit/7d9fb8fa9736413aee197b49724d015b094efbcb), [`444ab01`](https://github.com/DevinoSolutions/upup/commit/444ab0169cd7a0f71d3a02f7ce65e9691f11cefa), [`8527750`](https://github.com/DevinoSolutions/upup/commit/85277507e78678c5df100ab5fa18ac9f4c4a7bae), [`ceec02f`](https://github.com/DevinoSolutions/upup/commit/ceec02f6126ab69b6e21a38438e608ede4683793)]:
    - @useupup/core@3.4.0
    - @useupup/react@3.4.0
    - @useupup/server@3.4.0

## 3.3.5

### Patch Changes

- Updated dependencies []:
    - @useupup/core@3.3.5
    - @useupup/react@3.3.5
    - @useupup/server@3.3.5

## 3.3.4

### Patch Changes

- Updated dependencies [[`4f9324d`](https://github.com/DevinoSolutions/upup/commit/4f9324d9ee3c63238b0d9478fa21110ad390b734), [`900a560`](https://github.com/DevinoSolutions/upup/commit/900a5605e269d15df1a1fa2a2c921f351c44e888)]:
    - @useupup/core@3.3.4
    - @useupup/react@3.3.4
    - @useupup/server@3.3.4

## 3.3.3

### Patch Changes

- Updated dependencies [[`bf817fc`](https://github.com/DevinoSolutions/upup/commit/bf817fc1bf57b56cc4ca7e6e11209a6ab4429f4d)]:
    - @useupup/core@3.3.3
    - @useupup/react@3.3.3
    - @useupup/server@3.3.3

## 3.3.2

### Patch Changes

- Updated dependencies [[`5921da4`](https://github.com/DevinoSolutions/upup/commit/5921da4d1c3094d76fbbd0f5deee7a1c5e7efbe9)]:
    - @useupup/core@3.3.2
    - @useupup/server@3.3.2
    - @useupup/react@3.3.2

## 3.3.1

### Patch Changes

- Updated dependencies [[`7df75e6`](https://github.com/DevinoSolutions/upup/commit/7df75e6b430e080bf8f3931297ec171d86ff19ce), [`e4393b5`](https://github.com/DevinoSolutions/upup/commit/e4393b5652add229c9d5fa849cba2ba97913f7cf), [`db9ea90`](https://github.com/DevinoSolutions/upup/commit/db9ea90af5b1916763d607baee81e118b6d7c718), [`720d273`](https://github.com/DevinoSolutions/upup/commit/720d2735d268b242338b70afa380161cf7107036), [`32ae800`](https://github.com/DevinoSolutions/upup/commit/32ae80094b21ea7064a5061d14d652b0e8bc7d82)]:
    - @useupup/core@3.3.1
    - @useupup/react@3.3.1
    - @useupup/server@3.3.1

## 3.3.0

### Minor Changes

- [#353](https://github.com/DevinoSolutions/upup/pull/353) [`5fbd2c6`](https://github.com/DevinoSolutions/upup/commit/5fbd2c671a1834cd8e884bda455eb5602480f829) Thanks [@AminDhouib](https://github.com/AminDhouib)! - Issue-batch release: headless and server API gaps reported by v1→v3 migrators.

    - `@useupup/react` re-exports the full core error surface — `UpupError` and its six subclasses, `UpupErrorCode`, and `uploadErrorFromResponse` — so framework-only apps no longer need a direct `@useupup/core` dependency for typed error handling (#339). `uploadErrorFromResponse` is now on core's public entry, making the documented import real.
    - Headless prop getters (`getRootProps` / `getDropzoneProps` / `getInputProps`) now share one override contract: overrides are spread first, getter-owned functional keys are set after, event handlers are composed instead of dropped, and `getInputProps` merges `style` rather than clobbering it (#341).
    - Restriction failures raised through the file input, dropzone drop, or paste no longer surface as unhandled promise rejections — the `restriction-failed` event remains the reporting channel (#342).
    - `@useupup/server`: new `getDownloadUrl(config, key, opts?)` primitive signs a GET for an existing key without a handler, and `downloadUrlExpiresIn` makes the download-URL expiry configurable (#343).
    - `@useupup/server`: new `hooks.onPresignResponse` rewrites the presign, multipart-init, and sign-part responses (for proxied or non-browser-reachable storage endpoints), and an `UpupError` thrown from `onBeforeUpload` now surfaces its message and code in the 403 instead of a generic rejection (#338).
    - `@useupup/server`: `storage` accepts a per-request resolver `(ctx) => StorageConfig` for multi-bucket routing; multipart continuations are bound to the resolved destination through the HMAC-signed upload token, and `keyStrategy` now receives `metadata` and `req` (#337).
    - `@useupup/next`: the Pages Router handler body is `BodyInit`-compatible with newer `@types/node`.

### Patch Changes

- [#363](https://github.com/DevinoSolutions/upup/pull/363) [`c40ddf5`](https://github.com/DevinoSolutions/upup/commit/c40ddf554b12ecd13fd974452972791928974e84) Thanks [@AminDhouib](https://github.com/AminDhouib)! - Fix `import '@useupup/<framework>/styles'` failing to type-check on TypeScript 6+ (#357).

    Every framework package exported its stylesheet as a bare string (`"./styles": "./dist/tailwind-prefixed.css"`). TypeScript 6 began type-checking side-effect imports, so the documented stylesheet import failed with `TS2882: Cannot find module or type declarations for side-effect import`, forcing consumers to hand-write an ambient `declare module` shim. The `./styles` subpath now carries a `types` condition backed by a generated empty-module declaration (`dist/styles.d.ts`), plus a `typesVersions` fallback so legacy `moduleResolution: "node10"` consumers resolve it too. This is a types-only change: the `default` condition still points at the same unmoved `dist/tailwind-prefixed.css`, so runtime resolution, bundler behavior, and the CSS itself are byte-for-byte unchanged.

- Updated dependencies [[`5fbd2c6`](https://github.com/DevinoSolutions/upup/commit/5fbd2c671a1834cd8e884bda455eb5602480f829), [`8446ca0`](https://github.com/DevinoSolutions/upup/commit/8446ca0c8ad26e2a1704a2d8bd11fc306c434f5d), [`03b4e82`](https://github.com/DevinoSolutions/upup/commit/03b4e82baed0d751ba5da688715ef48748e7fe51), [`c40ddf5`](https://github.com/DevinoSolutions/upup/commit/c40ddf554b12ecd13fd974452972791928974e84)]:
    - @useupup/core@3.3.0
    - @useupup/react@3.3.0
    - @useupup/server@3.3.0

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
    - @useupup/server@3.2.0

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

- Updated dependencies [[`a51ab7b`](https://github.com/DevinoSolutions/upup/commit/a51ab7bcc9b35d50ec038ad05532abccee9b12b6), [`79a2861`](https://github.com/DevinoSolutions/upup/commit/79a2861ffc6259485075ac54c85c564fd58c7b86)]:
    - @useupup/react@3.1.0
    - @useupup/core@3.1.0
    - @useupup/server@3.1.0
