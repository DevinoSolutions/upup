# Playground field audit — 2026-04-26

Walking every sidebar field one by one. Three columns matter:

- **Verify**: does the preview actually change when I touch it?
- **Switch**: what should change to make it nicer to use? (label / primitive / hidden-by-default / conditional / unit)
- **Status**: ⬜ unchecked · ✅ works · ⚠️ works but rough · ❌ broken/no-op · 🤷 untestable in playground (needs backend)

Legend for "Switch":
- *primitive* — wrong primitive (e.g. raw `number` for bytes when `size-unit` exists)
- *labels* — enum/preset values shown without human-readable label
- *conditional* — only relevant when sibling field set; should hide otherwise
- *dup* — duplicates another field
- *unit* — needs explicit unit hint (ms, %, etc.)
- *icon* — would benefit from a per-option icon (locales = flags, etc.)
- *gate* — is config-only; hide behind disclosure / move to Advanced
- *none* — fine as-is

---

## 1. Upload

| id | primitive | switch | status | notes |
|---|---|---|---|---|
| `provider` | enum (segmented + brand tiles) | none | ⬜ | brand tiles already shipped |
| `maxConcurrentUploads` | number 1–10 | none | ⬜ | |
| `maxRetries` | number 0–10 | none | ⬜ | |
| `autoUpload` | bool | none | ⬜ | |
| `crashRecovery` | bool | none | ⬜ | toggling restores last queue from IndexedDB; verify storage write |
| `resumable.mode` | enum (multipart/tus) | labels | ⬜ | "tus" is jargon — relabel "tus protocol" or add description |
| `resumable.chunkSizeBytes` | **number 1024–104857600** | **primitive** | ⬜ | raw bytes is hostile. Switch to `size-unit` (5 MB default) |
| `resumable.endpoint` | string | **conditional** | ⬜ | only relevant when mode=tus. Hide when mode=multipart |

## 2. Sources

| id | primitive | switch | status | notes |
|---|---|---|---|---|
| `sources` | multi (9) | none | ⬜ | already brand-tile MultiSelect; verify each toggle gates the source button in preview |
| `showSelectFolderButton` | bool | **dup** | ⬜ | duplicates `behavior.allowFolderUpload` — pick one |

## 3. Limits

| id | primitive | switch | status | notes |
|---|---|---|---|---|
| `accept` | combo + 6 presets | none | ⬜ | verify file picker actually filters when you click browse |
| `maxFiles` | number 1–100 | none | ⬜ | verify "max 10 files" copy in preview updates |
| `maxFileSize` | size-unit | none | ⬜ | |
| `minFileSize` | size-unit | none | ⬜ | |
| `maxTotalFileSize` | size-unit | none | ⬜ | |

## 4. Processing

All bools, default false. Verify each toggles its config flag through to the uploader runtime. Most are pre-upload pipeline steps that won't visibly fire without an actual file selection.

| id | switch | status | notes |
|---|---|---|---|
| `imageCompression` | none | ⬜ | 🤷 needs file pick to fire |
| `thumbnailGenerator` | none | ⬜ | 🤷 needs file pick |
| `checksumVerification` | none | ⬜ | 🤷 needs file pick |
| `heicConversion` | none | ⬜ | 🤷 |
| `stripExifData` | none | ⬜ | 🤷 |
| `contentDeduplication` | none | ⬜ | 🤷 |

→ shared switch idea: add a "🤷 Pick a file to see it run" hint banner above this category.

## 5. Editor

| id | primitive | switch | status | notes |
|---|---|---|---|---|
| `imageEditor.enabled` | bool | none | ⬜ | gates everything below — children should disable when off |
| `imageEditor.display` | enum (inline/modal) | **conditional** | ⬜ | hide when `enabled=false` |
| `imageEditor.autoOpen` | enum (never/single/always) | **labels + conditional** | ⬜ | "single" → "When 1 image"; hide when `enabled=false` |
| `imageEditor.output.quality` | number slider 0–1 step 0.05 | **unit** | ⬜ | display value as percent (`80%`), not `0.8` |

## 6. Behavior

| id | primitive | switch | status | notes |
|---|---|---|---|---|
| `mini` | bool | none | ⬜ | should visibly shrink dropzone in preview |
| `enablePaste` | bool | none | ⬜ | verify Ctrl+V paste fires onFilesSelected |
| `allowFolderUpload` | bool | **dup** | ⬜ | duplicates `sources.showSelectFolderButton` — drop one |
| `disableDragDrop` | bool | none | ⬜ | dropzone should disappear |
| `allowPreview` | bool (default true) | none | ⬜ | thumbnails after pick |
| `showBranding` | bool (default true) | none | ⬜ | "Built by Devino" footer toggles |
| `isProcessing` | bool | none | ⬜ | demo-only; force the loading overlay |

## 7. Appearance

| id | primitive | switch | status | notes |
|---|---|---|---|---|
| `theme.mode` | enum segmented | none | ⬜ | verify dark mode actually flips uploader |
| `theme.tokens.color.primary` | color | none | ⬜ | verify primary tile/button color changes |
| `theme.slots.uploader.container` | combo (3 presets) | none | ✅ | verified Sharp-ring → ring-2 + rounded-md |
| `theme.slots.fileList.root` | combo | none | ⬜ | needs file pick to see |
| `theme.slots.fileList.uploadButton` | combo | none | ⬜ | needs file pick |
| `theme.slots.filePreview.deleteButton` | combo | none | ⬜ | needs file pick |
| `theme.slots.progressBar.fill` | combo | none | ⬜ | needs upload to fire |
| `theme.slots.sourceSelector.adapterButton` | combo | none | ⬜ | should affect source button row immediately |
| `theme.slots.sourceView.header` | combo | none | ⬜ | needs entering a drive picker |
| `theme.slots.urlUploader.fetchButton` | combo | none | ⬜ | needs Link source open |
| `className` | combo | none | ⬜ | applied to root — verify `mx-auto` centers the frame |

## 8. Language

| id | primitive | switch | status | notes |
|---|---|---|---|---|
| `i18n.locale` | enum (9 locales) | **labels + icon** | ⬜ | bare `en-US` → "English (US) 🇺🇸"; verify dropzone copy switches |
| `i18n.fallbackLocale` | enum (9 locales) | **labels + icon + gate** | ⬜ | hide behind disclosure — most users never need it |
| `i18n.overrides.common.upload` | combo | none | ⬜ | verify text rewrites the upload button copy |
| `i18n.overrides.common.cancel` | combo | none | ⬜ | needs an active upload to test |
| `i18n.overrides.dropzone.label` | combo | none | ⬜ | should change empty-state copy |
| `i18n.overrides.header.filesSelected` | combo | none | ⬜ | needs file pick |

## 9. Events

22 booleans grouped by lifecycle. Each should:
1. Wire `console.log` callback into uploader props
2. Append fired event into the EventLog panel below the preview

Verification needs an actual user interaction (drag, pick, upload). 🤷 mostly untestable without files.

| group | count | switch | status |
|---|---|---|---|
| Selection & clicks | 4 | none | ⬜ |
| Validation | 4 | none | ⬜ |
| Upload lifecycle | 8 | none | ⬜ |
| File management | 2 | none | ⬜ |
| Drag & drop | 3 | none | ⬜ |
| Errors & processing | 3 | none | ⬜ |

→ shared switch: add a "Toggle, then pick a file to fire" hint banner.

## 10. Advanced — self-host

| id | primitive | switch | status | notes |
|---|---|---|---|---|
| `mode` | enum segmented | none | ⬜ | gates the next two |
| `tokenEndpoint` | string | **conditional** | ⬜ | client mode only |
| `serverUrl` | string | **conditional** | ⬜ | server mode only |
| `apiKey` | string | **gate** | ⬜ | move to "Managed mode" disclosure |
| `uploadEndpoint` | string | **gate** | ⬜ | rarely needed; advanced disclosure |
| `processingEndpoint` | string | **gate** | ⬜ | advanced disclosure |
| `processingTimeout` | number 1000–600000 | **unit** | ⬜ | show as seconds (1–600 s) with `s` suffix |
| `enableAutoCorsConfig` | bool | none | ⬜ | |
| `cloudDrives.googleDrive` (3 fields) | nested string | none | ⬜ | verify env-seeded values populate |
| `cloudDrives.oneDrive.clientId` | string | none | ⬜ | |
| `cloudDrives.dropbox.clientId` | string | none | ⬜ | |
| `cloudDrives.box.clientId` | string | none | ⬜ | |

---

# Switch summary (executable list)

Status as of 2026-04-26 commit:

| # | Switch | Status |
|---|---|---|
| 1 | `resumable.chunkSizeBytes` → `size-unit` with bytes serialization | ✅ shipped — verified in browser, code tab shows `chunkSizeBytes: 7340032` for 7 MB input |
| 2 | `resumable.endpoint` hidden unless `mode === 'tus'` | ✅ shipped — verified appears/disappears on mode toggle |
| 3 | Drop `behavior.allowFolderUpload` (kept canonical `sources.showSelectFolderButton`) | ✅ shipped — confirmed gone from sidebar |
| 4 | `imageEditor.{display,autoOpen,quality}` hidden unless `enabled === true` | ✅ shipped — verified children appear after enable |
| 5 | `imageEditor.autoOpen` labels (never/single/always → human strings) | ✅ shipped — "Never" / "When 1 image is added" / "Always" |
| 6 | `imageEditor.display` labels (inline/modal → human strings) | ✅ shipped — "Inline (in dropzone)" / "Modal overlay" |
| 7 | `imageEditor.output.quality` percent readout | ✅ shipped — slider shows "80%" |
| 8 | `advanced.processingTimeout` unit hint | ⏭️ deferred — would need a `ms`-aware primitive; description bump suffices for now |
| 9 | `advanced.{tokenEndpoint,serverUrl}` mode-gated | ✅ shipped — verified Token only in client mode, Server URL only in server mode |
| 10 | `advanced.{apiKey,uploadEndpoint,processingEndpoint}` move to disclosure | ⏭️ deferred — adds disclosure infra; current order acceptable |
| 11 | Locale option labels humanized (`en-US` → "English (US)" etc.) | ✅ shipped — verified both `i18n.locale` and `i18n.fallbackLocale` |
| 12 | `i18n.fallbackLocale` collapse into disclosure | ⏭️ deferred — same disclosure infra as #10 |
| 13 | Intro banners on Processing + Events | ✅ shipped — verified rendered |
| —  | Bonus: `advanced.mode` segmented labels humanized | ✅ shipped — "Client (browser → storage)" / "Server (browser → @upup/server)" |

# Runtime verification pass (2026-04-26)

Walked every category in Chrome DevTools against http://localhost:53004. Findings:

| Field | Status | Notes |
|---|---|---|
| `theme.mode` light/dark/system | ✅ | `data-theme` attr on UpupThemeProvider flips correctly. System resolves via `prefers-color-scheme`. |
| `theme.tokens.color.primary` | ✅ partial | `--upup-color-primary` CSS var updates instantly. ⚠️ `--upup-color-primary-hover` and `--upup-color-border-active` do NOT auto-derive — picking red leaves cyan hover/border. Upstream concern. |
| `i18n.locale=ar-SA` | ✅ shipped fix | Was broken — string locale only flipped RTL, strings stayed English. Added `localePack` resolution in `UploaderPreview.tsx` so the playground passes the matching pack alongside the locale string. Now flips both copy AND direction. |
| `i18n.fallbackLocale` | ✅ | Same lookup applied. |
| `accept` filter | ✅ | Picking "Images" sets `accept="image/*"` on the underlying `<input type="file">`. There is **no** separate denylist prop in the API. |
| `maxFiles` | ✅ | Dropzone copy "up to N files" updates immediately. |
| `maxFileSize` | ✅ partial | Echoes in dropzone footer ("Max N GB files are allowed"). Validation rejection on oversized picks needs a real file. |
| `minFileSize` | ⚠️ silent | Wired correctly to the prop, but the uploader's UI **does not echo it** in the dropzone copy. Only fires `onRestrictionFailed` when a too-small file is picked. Playground description now states this explicitly. |
| `maxTotalFileSize` | ⚠️ silent | Same — wired but never stated upfront. Fires `onRestrictionFailed` when the sum exceeds the limit. Playground description tightened. |
| `cloudDrives.*` env-seed grey-out | ✅ | google_drive / oneDrive / dropbox / box tiles render `data-unavailable=true` with the env-var hint title when no clientId is set. |
| `events.onIntegrationClick` | ✅ | Toggled on → clicked My Device tile → `23:10:42.815 onIntegrationClick "INTERNAL"` row appeared in EventLog. Same wiring path covers the other 21 events. |
| `processing.*` (6 bools) | ✅ | All 6 toggles serialize through to the UpupUploader code snippet (verified via Code tab). Visible pipeline run needs a real file. |
| `behavior.mini` | ✅ | Frame collapses 480px → 280px, sources hidden, branding hidden. |
| `behavior.disableDragDrop` | ❌ removed | **Dead prop in upup-react-file-uploader@2.2.0** — declared in types but never destructured/consumed. Removed from playground. |
| `behavior.showBranding=false` | ✅ fixed in playground | Was misdiagnosed as upstream — actually a BoolToggle bug. Unchecking a default-true prop wrote `undefined` instead of `false`, so the uploader's destructure default `= true` always won. Fixed by taking `defaultValue` and writing the explicit boolean only when it diverges. Branding div now correctly removed from DOM on uncheck. |
| `behavior.isProcessing` | ⚠️ context-only | Only renders the loading overlay inside FileList — invisible without queued files. Description updated to make this clear. |
| `behavior.allowPreview` | 🤷 | Default true; effect needs file pick (thumbnail next to queued file). |
| `behavior.enablePaste` | 🤷 | Wires to Ctrl+V handler; needs paste interaction to confirm. |
| `theme.slots.uploader.container` | ✅ | Verified previously (Sharp ring → ring-2). |
| `theme.slots.{fileList.*, filePreview.*, progressBar.*, sourceView.header, urlUploader.fetchButton}` | 🤷 | Same wiring as the verified slot. Visible effect requires a file pick / drive picker open. |

Code changes from this pass:
- `UploaderPreview.tsx` — resolve `i18n.locale` / `i18n.fallbackLocale` strings to packs and pass via `localePack` so the uploader's resolver actually swaps copy.
- `categories/behavior.ts` — drop dead `disableDragDrop` entry; tighten `isProcessing` description.

Items still ⚠️ flagged that need upstream fixes in upup-react-file-uploader@2.2.0:
1. `theme.tokens.color.primary` — picking the base primary should also derive primary-hover and border-active.

(`behavior.showBranding=false` was misdiagnosed as upstream — see audit row; fixed in BoolToggle on the playground side.)
