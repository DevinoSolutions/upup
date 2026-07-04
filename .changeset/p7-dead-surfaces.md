---
"@upup/core": minor
"@upup/server": minor
"@upup/react": minor
"@upup/angular": minor
"@upup/vanilla": minor
"@upup/vue": minor
"@upup/svelte": minor
"@upup/preact": minor
---

## Delete dead surfaces; wire locale, worker timeout, destroy-revoke, and server lifecycle hooks

Deleted four dead surfaces that were shipping decoys instead of the real
extension points: `@upup/react`'s orphaned `recipes/` styling layer (never
publicly exported, nothing rendered through it), its unused/buggy
`checkFileType` matcher, `@upup/angular`'s dead `SOURCE_ICONS` map (the real
icon path is `SourceSelectorComponent`'s own `ICON_MAP`), and a `load-script`
static dependency inlined into a small DOM script injector. Consolidated
`@upup/vanilla`'s hand-authored `ServerModeProvider`/`ServerDriveFile` types
and `@upup/react`/`@upup/vue`/`@upup/svelte`/`@upup/angular`'s four
independently hand-authored `UploaderProps` shapes onto one canonical
`UploaderBaseProps` exported from `@upup/core` (type-only, structurally
identical resolved shape — no behavior change). Wired four previously
documented-but-inert capabilities: `CoreOptions.locale` now also drives the
file-pipeline translator (not just the UI), a new `workerTimeoutMs` option
tunes the web-worker task timeout (default unchanged), orchestrator
`destroy()` now revokes every still-selected file's blob URL (previously only
`handleCancel()` did, leaking `createObjectURL` allocations across SPA route
changes), and `@upup/server`'s `onFileUploaded`/`onUploadComplete` hooks now
fire on `POST /multipart/complete` (previously `onUploadComplete` had zero
call-sites) — built only from complete-time-trusted data, with no change to
the upload-token trust model. `@upup/preact` bundles `@upup/react`, so its
built output picks up the react-side changes even though its own source is
untouched.
