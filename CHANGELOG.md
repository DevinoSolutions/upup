# Changelog

All notable changes to this project are documented here. Dates use `YYYY-MM-DD`.

## Current architecture (2.2.0)

upup ships as **nine published `@upupjs/*` packages**, versioned and released
together via [changesets](https://github.com/changesets/changesets):

- **`@upupjs/core`** — the headless engine (file state, upload pipeline,
  cloud-drive plugins, i18n, theme). Zero framework dependencies, and published
  in its own right — not a private, bundled-in source.
- **`@upupjs/react`** — the canonical UI. `@upupjs/vue`, `@upupjs/svelte`,
  `@upupjs/angular`, and `@upupjs/vanilla` are native, DOM-identical ports of it, and
  `@upupjs/preact` is a `preact/compat` re-export of `@upupjs/react`.
- **`@upupjs/next`** — client re-export plus `/server` route handlers (App and
  Pages routers).
- **`@upupjs/server`** — optional Server Mode endpoints (S3/MinIO presign + proxy
  upload, drive-token exchange) behind an HMAC-signed upload-token trust model.
  The framework-agnostic factory is `createUpupHandler` (`createUpupNextHandler`
  wraps it for Next.js). The server-side drive→S3 transfer buffer is bounded at a
  fixed 5 MB (`SINGLE_PUT_MAX_BYTES`).

Client Mode (browser ↔ storage direct) is the default; Server Mode is strictly
opt-in.

**Versioning and release notes are generated per package by changesets** —
consult each package's own `CHANGELOG.md` for its published history going
forward, and `.github/workflows/publish.yml` for how the nine packages are
released together.

---

> **Historical log — pre-v2 / early-v2.** _(Editorial note added 2026-07-08.)_
> The dated entries below predate the architecture described above and are kept
> verbatim as a historical record. They describe a superseded design whose names
> no longer exist in the codebase: a two-package publish
> (`upup-react-file-uploader` plus a private `@upupjs/shared`), a `createHandler()`
> server API, a configurable `multipartThreshold` server knob, and the `Adapter*`
> UI vocabulary (`sourceSelector.adapterButton`, the uploader's "adapter row")
> since swept to `Source*` / `Drive*` / `Uploader*` names. Read them as history,
> not as the current 2.2.0 API.

---

## [Unreleased] — planned v2.2.0

Adds Server Mode end-to-end. Client Mode (v2.0 / v2.1) is unchanged
and remains the default — no migration required.

### Added

- **`mode` prop on `<UpupUploader>`.** Accepts `'client'` (default) or
  `'server'`. In Server Mode the uploader talks only to the consumer's
  `serverUrl`; drive APIs and storage writes are proxied through
  `@upupjs/server`.
- **`@upupjs/server` Server Mode surface.** `createHandler()` now
  implements the 3 TODO routes from v2.1: `/auth/:provider/cb`
  (OAuth code exchange for Google, Microsoft, Dropbox, Box),
  `/files/:provider` (list with search + folder navigation, normalised
  `{ id, name, size, mimeType, isFolder, modifiedAt }`),
  `/files/:provider/transfer` (streams drive → S3, switches to
  multipart at `multipartThreshold` — default 100 MB).
- **`InMemoryTokenStore`** — TTL-aware reference token store. Three
  string-in-string-out methods; swap for Redis / KV / DynamoDB in
  production.
- **`getUserId` config hook** — resolves the authenticated user per
  request for OAuth state scoping and token persistence.
- **`box` provider slot** in `createHandler` config. Server Mode lists
  and transfers Box files through Box's Content API (`api.box.com/2.0`).
- **`ServerModeDriveUploader` React component** — uses our picker UI
  for all 4 drives in Server Mode, handles re-auth popups via
  `postMessage` back to the opener window.
- **Guides: `docs/guides/modes.md` + `docs/guides/server-mode-setup.md`.**
  One-page setup for Next.js App Router + Redis-style token store.

### Security

- No OAuth refresh tokens are persisted by default. Access-token
  expiry returns `401 { reauth: true }`; the client surfaces its
  existing "Sign in" state. Shorter blast radius than long-lived
  refresh tokens in an untrusted store.

### Notes

- Server Mode is strictly opt-in. `mode="client"` matches v2.0 / v2.1
  behaviour byte-for-byte.
- `@upupjs/server` remains Node-only and has no runtime entry in the
  React package's dist — your client bundle stays free of AWS SDKs.

---

## [Unreleased] — planned v2.1.0

This release removes four legacy v1 props and stitches up the last
rough edges from the v2 refactor. It is a **breaking change** for
anyone still on the v1 surface; see `docs/migration/v2-to-v2.1.md` for
the one-page migration guide.

### ⚠️ Breaking changes

- **Entire package rewire.** The legacy v1 implementation that lived
  in `packages/upup` has been deleted; `upup-react-file-uploader@2.1`
  is now backed by the v2 code in `packages/react` with
  `@upupjs/core`/`@upupjs/shared` bundled in. Consumers upgrading from
  v2.0.0 get a fundamentally different runtime — the public prop
  surface is the migration guide (`docs/migration/v2-to-v2.1.md`)
  but the engine, internals, i18n, theming, pipeline, and server
  helpers are all new.
- **Removed `dark` prop** — use `theme.mode: 'light' | 'dark' | 'system'`.
  The system path observes `prefers-color-scheme` and `html.dark` /
  `[data-theme]` ancestors.
- **Removed `limit` prop** — use `maxFiles`. Same semantics, new name.
- **Removed `shouldCompress` prop** — use `imageCompression`. Same
  semantics.
- **Removed `classNames` prop** — use `theme.slots` with the nested
  shape (`fileList.uploadButton`, `sourceSelector.adapterButton`, etc.).
  A new `flattenSlotsToClassNames()` helper in `@upupjs/shared` bridges
  the nested override onto the internal flat shape the component tree
  consumes.
- `theme.slots` is typed as `DeepPartialSlots` so partial overrides
  compile.
- `UpupUploaderPropsClassNames` is no longer publicly exported from
  `@upupjs/react`.
- `CoreOptions.locale` and `CoreOptions.translations` in `@upupjs/core`
  changed from `unknown` to proper types (`LocaleBundle |
UpupLocaleCode` and `Partial<UpupMessages>` respectively). No
  runtime change — consumers passing `unknown` now fail type-check.

### Added

- **Four new `provider` values**: `'r2'` (Cloudflare R2), `'wasabi'`,
  `'minio'`, `'gcs'` (Google Cloud Storage via S3 interop). All route
  through the same S3-compatible client path as `aws`/`backblaze`/
  `digitalocean`; your server-side presigner decides which SDK +
  endpoint to use when you receive the string. `UpupProvider` enum
  gains `CloudflareR2`, `Wasabi`, `MinIO`, `GCS` members.
- **`theme.slots` is now wired end-to-end.** Before this release it
  was publicly typed but silently ignored; the runtime read from the
  flat `classNames` prop. Now slot overrides reach the DOM. Four new
  slots added to `UpupThemeSlots` to cover v1 `classNames` keys that
  had no v2 equivalent: `filePreview.icon`, `fileList.addMoreButton`,
  `driveBrowser.itemInner`, `driveBrowser.searchContainer`.
- **Nine brand icons exported** from `@upupjs/react` for reuse:
  `MyDeviceIcon`, `BoxIcon`, `DropBoxIcon`, `GoogleDriveIcon`,
  `OneDriveIcon`, `LinkIcon`, `CameraIcon`, `AudioIcon`,
  `ScreenCastIcon`. These are the same SVGs used by the uploader's
  adapter row.
- `onBeforeFileAdded` now honours its typed contract: returning a
  `File` replaces the original file in the upload queue (was
  previously dropped).
- `paused` translation key + all 9 locale packs updated. The status
  label next to the progress bar is no longer hardcoded English.
- `authenticatePrompt` + `signInWith` translation keys (DriveAuthFallback
  used to hardcode these).
- `data-upup-slot="drive-browser-header"` + `"drive-browser-item"` —
  previously the only two components without a slot attribute.

### Fixed

- **SSR hydration mismatches** on first paint. Root causes: reading
  `navigator.onLine` (undefined in Node 21+), reading
  `html.classList.contains('dark')` during render, and calling
  `window.matchMedia` in the initial useState. All moved behind a
  mount guard or safe-initial-value pattern.
- Dropbox hooks imported `DropboxFile`, `DropboxRoot`, `DropboxUser`
  from the `dropbox` npm package; none of those are actual exports.
  Moved to a local `dropbox-types.ts` module. The bogus
  `@ts-expect-error typings incomplete` in `useDropboxAuth` is gone.
- Dropbox API errors logged via `console.error` now also route
  through the consumer-facing `onError` callback.

### Interactive playground (`@upupjs/interactive-example`)

The in-app playground got a full UX pass:

- **Source tiles with authentic brand colours** in place of text-only
  checkboxes.
- **Live event log panel** beneath the preview — toggle any callback
  in the Events category and fired events stream in with timestamps +
  JSON argument previews. Auto-scrolls, caps at 200 rows, with a
  Clear button.
- **Quick-start presets row** at the top of the sidebar: Photos only,
  Big uploads, Cloud storage, Edit before upload, Dark mode, Clear.
  Each applies a lean config snapshot via `ConfigContext.setConfig`.
- **Segmented enum controls** auto-selected for any enum with ≤ 6
  options; long lists (locales) stay as `<select>`.
- **Advanced — self-host** category now isolates credentials
  (tokenEndpoint, serverUrl, apiKey, cloud-drive client IDs) so a
  first-time visitor lands on conceptual knobs, not empty URL fields.
- **Size+Unit rows inline** (one line × 3 instead of stacked nested
  fieldsets) in Limits.
- **Default values now visible** on first load — segmented controls
  render the declared default as active, number inputs show the
  default as a placeholder.
- **Events category grouped by lifecycle** — six sections (Selection
  & clicks / Validation / Upload lifecycle / File management / Drag &
  drop / Errors & processing).
- **Color picker** (`<input type="color">` + hex readout) for
  `theme.tokens.color.primary`.
- **Range slider** for `imageEditor.output.quality`.
- **Inline descriptions** on every toggle, enum, and number input —
  no more guessing what "Compress images" or "Mini mode" actually does.
- Cloud drive credential blocks stamped with brand icons in their
  legends.
- Renamed `isProcessing (demo loading state)` → "Demo: show loading
  state" with a clearer description. Removed duplicated
  "Auto-configure S3 CORS" toggle from Behavior (kept in Advanced).

### Tooling

- `pnpm dev` now starts the playground alongside landing + docs.
- Playground dev server self-heals stale Next.js `.next/dev/lock`
  files on Windows.
- Seed v2-clean branch comparison doc at
  `docs/v2-clean-vs-dev.md`.

### Test coverage

- +12 unit tests for `flattenSlotsToClassNames` in `@upupjs/shared`
- +3 DOM integration tests in `@upupjs/react` proving `theme.slots`
  overrides reach the rendered markup
- +3 new `EnumSelect` cases covering segmented default + auto-select
  fallback layouts
- All 1,774 tests green across shared / core / react / interactive-example

Totals by package (after this release):

- shared: 360 tests
- core: 571 tests
- react: 780 tests
- interactive-example: 66 tests

---

## [2.0.0] — 2026-03-16

Initial v2 publish of `upup-react-file-uploader`. The monorepo
refactor (86-feature checklist in
`docs/superpowers/audits/V2_COMPLETE_STATUS.md`) landed here. Ship
history prior to that tag predates this changelog.
