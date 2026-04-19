# Changelog

All notable changes to this project are documented here. **One npm
package ships from this repo**: `upup-react-file-uploader` (sources at
`packages/react`; the legacy `packages/upup` v1 codebase was retired
in v2.1). Internal workspace packages (`@upup/core`, `@upup/shared`,
`@upup/server`) still exist as private sources of modular testability
but are bundled into the published artifact — consumers install one
thing and get the whole engine.

Dates use `YYYY-MM-DD`.

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
  `@upup/core`/`@upup/shared` bundled in. Consumers upgrading from
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
  A new `flattenSlotsToClassNames()` helper in `@upup/shared` bridges
  the nested override onto the internal flat shape the component tree
  consumes.
- `theme.slots` is typed as `DeepPartialSlots` so partial overrides
  compile.
- `UpupUploaderPropsClassNames` is no longer publicly exported from
  `@upup/react`.
- `CoreOptions.locale` and `CoreOptions.translations` in `@upup/core`
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
- **Nine brand icons exported** from `@upup/react` for reuse:
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

### Interactive playground (`@upup/interactive-example`)

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

- +12 unit tests for `flattenSlotsToClassNames` in `@upup/shared`
- +3 DOM integration tests in `@upup/react` proving `theme.slots`
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
