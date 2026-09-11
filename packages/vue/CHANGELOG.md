# @useupup/vue

## 3.3.3

### Patch Changes

- [#394](https://github.com/DevinoSolutions/upup/pull/394) [`bf817fc`](https://github.com/DevinoSolutions/upup/commit/bf817fc1bf57b56cc4ca7e6e11209a6ab4429f4d) Thanks [@BSalaeddin](https://github.com/BSalaeddin)! - Declining an OAuth consent screen is reported as a cancellation, not as
  "Popup was blocked by the browser".

    Three things compounded. `DriveAuthFallback` auto-triggers sign-in on mount so
    the tile click's transient user activation is still live — but OneDrive, Dropbox
    and Box rendered it WITHOUT passing `error` (it stayed inside the
    `...uploaderProps` rest), so its `|| error` guard could never fire. A decline
    drove `isLoading` false, the view re-mounted with a fresh `attemptedRef`, and it
    retried by itself. That second `window.open` had no activation left, returned
    null, and `popup-oauth-plugin` reported the block — truthful about its own call,
    misleading about the user, who was sent into their browser's popup settings over
    a choice they had made themselves.

    The decline was also never surfaced on its own: the popup poll accepted only
    `href.startsWith(redirectUri) && href.includes('code=')`, so an
    `?error=access_denied` redirect fell through until the window closed, and a
    closed window resolved silently with no error and no state.

    Now:

    - Every drive component in every framework forwards `error` into its auth
      fallback, so the existing no-auto-retry-after-an-error guard is reachable
      across the remount (the guard itself stays React-only — no other framework's
      fallback auto-triggers on mount). The three popup providers had the same gap
      in React, Vue, Svelte, Angular and vanilla; vanilla gated the prop on Google
      Drive explicitly.
    - The poll reads `error` / `error_description` off the redirect and reports a
      refused or admin-walled consent as a cancellation; a closed window is a
      cancellation too, rather than a silent resolve. `authenticateViaPopup()` still
      RESOLVES in both cases — the promise contract is unchanged, and the
      cancellation travels on the provider's existing error event.
    - Cancellations carry `AUTH_DENIED` and a real popup block carries the new
      `AUTH_POPUP_BLOCKED` code, so the two can finally be told apart. The drive
      controller turns those into a `messageKey` on `DriveBrowserError`, and the
      renderer shows the matching catalogue string — the nine-locale `popupBlocked`
      that shipped unused, or a new `errors.authCancelled`. Every other failure keeps
      its own message, which carries detail a generic string would throw away.
    - A popup attempt that ends without a session now clears `isLoading`, cannot
      become an unhandled rejection, and ALWAYS leaves an error behind. A blocked
      popup threw before the state ever moved to `authenticating`, so the view sat on
      the spinner and the auth fallback carrying the error never rendered at all.
      Recording the error is not cosmetic: the React auth fallback opens one popup on
      mount while the tile click's user activation is live, and reads `error` to know
      an attempt has already happened — its own ref cannot, because clearing
      `isLoading` remounts the view with a fresh one. Most failures arrive on the
      provider's error event and are already in state; the gap was the ones that only
      THROW, such as an unconfigured `clientId`, which `getAuthUrl()` throws and never
      emits.

    `UpupAuthError` takes an optional third `code` argument, defaulting to the
    `AUTH_PROVIDER_ERROR` it always used, so existing call sites are unchanged.

    `ErrorMessages.authCancelled` is OPTIONAL, so a hand-written locale bundle still
    type-checks — that is why this is a patch and not a breaking minor. The uploader
    wires en-US as the fallback bundle and would resolve the key anyway;
    `driveErrorText` also carries the English wording for a translator built with no
    fallback at all, so an omission renders English rather than the key.

    The redirect poll reads the fragment as well as the query. The check it replaced
    matched `code=` anywhere in the href, so narrowing to `searchParams` alone would
    have left a spec-legal fragment-mode redirect unread until the window closed —
    reported, wrongly again, as a cancellation.

- Updated dependencies [[`bf817fc`](https://github.com/DevinoSolutions/upup/commit/bf817fc1bf57b56cc4ca7e6e11209a6ab4429f4d)]:
    - @useupup/core@3.3.3

## 3.3.2

### Patch Changes

- Updated dependencies [[`5921da4`](https://github.com/DevinoSolutions/upup/commit/5921da4d1c3094d76fbbd0f5deee7a1c5e7efbe9)]:
    - @useupup/core@3.3.2

## 3.3.1

### Patch Changes

- [#397](https://github.com/DevinoSolutions/upup/pull/397) [`db9ea90`](https://github.com/DevinoSolutions/upup/commit/db9ea90af5b1916763d607baee81e118b6d7c718) Thanks [@AminDhouib](https://github.com/AminDhouib)! - The default panel now shows your error message next to the machine code, and a
  skipped EXIF strip leaves a marker on the file (#367 items 2 and 4).

    A failure carrying a code used to render as `uploadFailedWithCode`, which
    interpolated the code and nothing else — so an endpoint that returned a useful
    sentence watched it disappear between `onError` and the panel. The key now has a
    second `{message}` slot carrying the error's own message, added to all nine
    locale bundles so translators control placement (override the key to reorder the
    slots, drop the code, or show only your own wording). All six framework panels
    pass both values, and the message is rendered as text, never as markup.

    `stripExifData` skips animated GIF/WebP/APNG because canvas has no animated
    encoder, which means an animated WebP or APNG reaches storage with the EXIF you
    asked to remove. The `exif` step now records that on the file:
    `metadata.metadataStripSkipped === true` with
    `metadata.metadataStripSkippedReason === 'animated-image'`. A file whose EXIF
    really was stripped carries `exifStripped: true` and no marker, and
    `imageCompression` skipping an animated image does not set it — nothing was asked
    to be removed. No new event, no new option.

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

- Updated dependencies [[`7df75e6`](https://github.com/DevinoSolutions/upup/commit/7df75e6b430e080bf8f3931297ec171d86ff19ce), [`e4393b5`](https://github.com/DevinoSolutions/upup/commit/e4393b5652add229c9d5fa849cba2ba97913f7cf), [`db9ea90`](https://github.com/DevinoSolutions/upup/commit/db9ea90af5b1916763d607baee81e118b6d7c718), [`720d273`](https://github.com/DevinoSolutions/upup/commit/720d2735d268b242338b70afa380161cf7107036)]:
    - @useupup/core@3.3.1

## 3.3.0

### Patch Changes

- [#363](https://github.com/DevinoSolutions/upup/pull/363) [`c40ddf5`](https://github.com/DevinoSolutions/upup/commit/c40ddf554b12ecd13fd974452972791928974e84) Thanks [@AminDhouib](https://github.com/AminDhouib)! - Fix `import '@useupup/<framework>/styles'` failing to type-check on TypeScript 6+ (#357).

    Every framework package exported its stylesheet as a bare string (`"./styles": "./dist/tailwind-prefixed.css"`). TypeScript 6 began type-checking side-effect imports, so the documented stylesheet import failed with `TS2882: Cannot find module or type declarations for side-effect import`, forcing consumers to hand-write an ambient `declare module` shim. The `./styles` subpath now carries a `types` condition backed by a generated empty-module declaration (`dist/styles.d.ts`), plus a `typesVersions` fallback so legacy `moduleResolution: "node10"` consumers resolve it too. This is a types-only change: the `default` condition still points at the same unmoved `dist/tailwind-prefixed.css`, so runtime resolution, bundler behavior, and the CSS itself are byte-for-byte unchanged.

- Updated dependencies [[`5fbd2c6`](https://github.com/DevinoSolutions/upup/commit/5fbd2c671a1834cd8e884bda455eb5602480f829), [`8446ca0`](https://github.com/DevinoSolutions/upup/commit/8446ca0c8ad26e2a1704a2d8bd11fc306c434f5d), [`03b4e82`](https://github.com/DevinoSolutions/upup/commit/03b4e82baed0d751ba5da688715ef48748e7fe51)]:
    - @useupup/core@3.3.0

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
- Updated dependencies [[`79a2861`](https://github.com/DevinoSolutions/upup/commit/79a2861ffc6259485075ac54c85c564fd58c7b86)]:
    - @useupup/core@3.1.0
