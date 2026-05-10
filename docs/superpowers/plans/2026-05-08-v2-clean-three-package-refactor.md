# Upup V2 Clean Three-Package Refactor Plan

## Summary

V2 clean ships as three public packages:

- `@upup/core`: contracts plus isomorphic workflow engine.
- `@upup/react`: React/browser host for core.
- `@upup/server`: server host for core.

Remove public `@upup/shared`. Move its contracts, errors, protocols, i18n bundles/helpers, and theme contracts into `@upup/core` with subpath exports such as `@upup/core/contracts`, `@upup/core/i18n`, `@upup/core/theme`, and `@upup/core/strategies`.

`mode?: 'client' | 'server'` stays. It means where provider/upload operations run. It does not mean local versus upload. If no upload target exists, Upup is local file collection only.

`@upup/react` targets React 19 for v2-clean. Do not advertise React 18 support again unless the optional editor/provider dependency graph is split or otherwise tested against React 18 without peer conflicts.

## Public API

- Keep `sources`: `local`, `url`, `camera`, `microphone`, `screen`, `googleDrive`, `oneDrive`, `dropbox`, `box`.
- Infer behavior:
  - no `uploadEndpoint`, no `serverUrl`, no external Tus/storage target: local file collection only.
  - `uploadEndpoint`: client-hosted flow by default.
  - `serverUrl`: server-hosted flow by default.
  - explicit `mode` wins only when config is valid.
  - ambiguous targets produce a typed config error.
- Client mode can own cloud providers through browser-safe adapters/config.
- Server mode owns sensitive OAuth secrets, provider downloads, storage writes, auth, and compliance workflows.
- Replace loose/old props:
  - `customProps` -> `metadata`
  - `showSelectFolderButton` and `allowFolderUpload` -> `folderUpload={{ enabled, showPickerButton }}`
  - `enableAutoCorsConfig` -> `cors={{ dangerouslyAutoConfigure, allowedOrigins, allowedMethods?, allowedHeaders?, maxAgeSeconds? }}`
- Remove from the stable runtime API: `tokenEndpoint`, `ProviderSDK`, `FileWithParams`, `UploadAdapter`, `uploadAdapters`, `driveConfigs`, `localePack`, flat `translations`, `classNames`, `dark`, bridge-only core sync APIs, and implicit hosted-service `apiKey`.

## Implementation Changes

- Move all `@upup/shared` imports to `@upup/core` or core subpaths; remove `packages/shared` from workspace release.
- Make `@upup/core` own file state, validation, queueing, byte progress, speed, ETA, retry, concurrency, pause, resume, cancel, destroy/abort, and upload/source/provider interfaces.
- Make `useUpupUpload` the single React behavior hook backed by `UpupCore`; keep `useRootProvider` UI-only.
- Make `@upup/server` host core through server runtime adapters, not a separate parallel upload/provider implementation.
- Implement real strategy selection in core:
  - direct upload
  - multipart upload
  - Tus external service upload
- Rename resumable config away from `mode`:
  - `resumable={{ protocol: 'multipart', thresholdBytes, chunkSizeBytes }}`
  - `resumable={{ protocol: 'tus', endpoint, headers, metadata, chunkSize, retryDelays }}`
- Lazy-load optional React integrations: camera, microphone, screen, cloud panels, image editor, HEIC, compression, provider SDKs.
- Keep React theme/i18n consumption on resolved core contracts; remove internal `dark`, flat `classNames`, and React-local flat i18n dependencies.

## Audit Must-Fixes

- Core must never mark files successful without a real upload. Local-only selection is valid, but calling `upload()` without a target returns a typed unavailable/no-target error.
- Fix direct and multipart signed headers: presign responses include `uploadHeaders`; browser uploads send them; do not sign browser-forbidden `Content-Length` for direct browser PUTs.
- Multipart must be actually wired and selected by threshold/config; remove tests that only lock direct/no-op behavior.
- Tus must be truly implemented before staying public.
- Fix lifecycle bugs: `destroy()` aborts uploads, `cancel()` clears stale state, pause/resume cannot race the same manager.
- Revalidate files transformed by `onBeforeFileAdded`; validate `setFiles` before clearing existing files; fail visibly on limits instead of silently truncating.
- Revoke object URLs on remove/reset/destroy.
- Wire or remove unused core `fileOverrides`.
- Processing features must not be misleading stubs: HEIC, compression, thumbnails, EXIF stripping, and checksum verification must be real, experimental, or disabled.
- Server defaults must be strict: auth/user scoping for OAuth/list/transfer unless `allowAnonymousUser: true`.
- Add server CORS/OPTIONS handling and move dangerous CORS auto-config orchestration into core with runtime adapters.
- Use one MIME matcher with wildcard support like `image/*`; validate cloud transfers against actual provider metadata.
- Extract Google Drive, OneDrive, Dropbox, and Box behind provider adapters with pagination/cursor support.
- Harden OAuth popup flow with allowlisted origins, target-specific `postMessage`, validated `returnTo`, and React origin checks.
- Token storage must respect expiry and refresh where possible.
- Return safe client errors; avoid leaking raw provider/server details.
- Support S3-compatible endpoint/path-style config; distinguish durable `publicUrl` from temporary signed `downloadUrl`.
- Fix server-mode drive state: folder navigation, search/list spam, retry/reauth, i18n strings, and transfers bypassing core state.
- Harden URL source: check `response.ok`, handle missing content type/extension, and avoid invalid generated filenames.
- Remove old public React subcomponent exports or make them intentionally private/internal.
- Fix release/install smoke so packed packages install without local overrides.
- Move image editor/provider heavy dependencies out of the default install path; until then, keep the React package dependency graph React 19-compatible and free of React 18 peer conflicts.

## Docs, Apps, Release

- Update README, docs, playground, landing, Mastra schema, generated snippets, interactive example, and e2e app to the three-package API.
- Update Mastra/theme schemas to use `theme.mode: 'light' | 'dark' | 'system'`, not stale `auto`.
- Lock package versions to `2.2.0`.
- Publish order: `@upup/core`, `@upup/server`, `@upup/react`.
- Root scripts should build/watch/release all three packages in dependency order.

## Verification

- Package checks: core, server, react test/typecheck/build.
- App checks: interactive example test/typecheck, playground typecheck/build, e2e app tests.
- Full gates: `pnpm typecheck`, `pnpm test`, `pnpm build`.
- API cleanup search: no runtime `@upup/shared`, no removed v1 names except migration docs/changelog.
- Package smoke: pack the three public packages, install into a temp consumer without workspace links, typecheck all public entrypoints.
- MCP browser pass: playground desktop/mobile, local-only selection, client mock upload, server mock upload, failure/retry, source switching, theme light/dark/system, Arabic RTL, screenshots, no uncaught console errors.
