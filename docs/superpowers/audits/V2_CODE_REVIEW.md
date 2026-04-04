# v2.0 Rewrite -- Final Code Review

**Reviewer:** Claude Opus 4.6
**Date:** 2026-03-29
**Branch:** dev
**Scope:** All 4 new packages (shared, core, react, server) + app integrations

---

## CRITICAL ISSUES (must fix before merge)

### C1. `@upup/shared` has React peer dependency -- breaks server-only consumers

**File:** `packages/shared/package.json` (lines 28-35)

The `@upup/shared` package declares `react` as a peer dependency (optional) and has `@types/react` in devDependencies. This exists solely because `types/icons.ts` imports `FC` from React. However, `@upup/shared` is also consumed by `@upup/core` and `@upup/server`, which are framework-agnostic. A backend-only project using `@upup/server` will get a peer dependency warning about React.

**Recommendation:** Move the `UploaderIcons` type to `@upup/react` where it belongs. The shared package should contain zero React references. This preserves the clean dependency graph: `shared -> nothing`.

### C2. `UpupValidationError` constructor accepts `string` but `UpupErrorCode` enum passed

**File:** `packages/shared/src/errors.ts` (line 36) + `packages/core/src/file-manager.ts` (lines 82-86)

The `UpupError` base class declares `code: string`, but the `UpupValidationError` passes `UpupErrorCode` enum values as the `reason` parameter, which is then passed as the `code` to `super()`. While this works at runtime (enums are strings), the constructor signature `(message: string, reason: RestrictionFailedReason, file: File)` uses a union type `RestrictionFailedReason` for `reason`, but `FileManager` passes `UpupErrorCode.TYPE_MISMATCH` which is not in the `RestrictionFailedReason` union -- it should be `'TYPE_MISMATCH'` (the string literal). This appears to work because `UpupErrorCode.TYPE_MISMATCH === 'TYPE_MISMATCH'`, but it is technically a type mismatch that TypeScript should catch. Verify this compiles without error; if it does it is only because the enum values happen to match the string literals.

### C3. Missing `files` field in 3 of 4 package.json files

**Files:** `packages/shared/package.json`, `packages/react/package.json`, `packages/server/package.json`

Only `@upup/core` has `"files": ["dist"]`. The other three packages lack this field, meaning when published to npm they will include source files, test files, config files, and everything else. This bloats the published package.

**Recommendation:** Add `"files": ["dist"]` to all four package.json files.

### C4. `nativeToUploadFile` uses `Object.assign` with `null` values on typed fields

**File:** `packages/core/src/file-manager.ts` (lines 43-54)

The function assigns `null` to fields typed as `string` / `string | undefined` in the `UploadFile` type (e.g., `url: null`, `key: null`). The `UploadFile` type defines `url: string` and `key?: string`, not `string | null`. The `as unknown as UploadFile` cast hides this mismatch. Downstream code checking `file.key !== null` (as in `core.ts` line 93) works at runtime but the types are inconsistent.

**Recommendation:** Either update `UploadFile` type to use `string | null` for optional fields, or initialize with `undefined`/empty string to match the declared types.

---

## IMPORTANT ISSUES (should fix soon)

### I1. Excessive `any` casts in `@upup/react` (30+ instances)

**Files:** Multiple files in `packages/react/src/`

The react package has significant `any` usage, particularly:
- `(ctx as any)?.core?.options?.onError` -- repeated in 5+ hooks (google-drive, dropbox, onedrive uploaders)
- `(classNames as any)?.containerHeader` -- 7 instances in file-list.tsx
- `(entry as any)` in dropbox utilities
- `(current as any)` in drive tree walking

This suggests the `UploaderContextValue` type is incomplete -- it does not expose `core.options` properly, forcing consumers to cast.

**Recommendation:** Extend `UploaderContextValue` or `UseUpupUploadReturn` to expose commonly needed options (onError, accept, drive configs) without casting through `any`.

### I2. `fastify.ts` uses `any` for framework types

**File:** `packages/server/src/fastify.ts` (lines 7-8)

The Fastify adapter uses `any` for `fastify`, `request`, and `reply`. While the design goal was to avoid importing `express`/`fastify` types, the Express adapter properly defines inline interfaces (`ExpressReq`, `ExpressRes`). Fastify should get the same treatment.

**Recommendation:** Define inline `FastifyInstance`, `FastifyRequest`, `FastifyReply` interfaces analogous to the Express adapter pattern.

### I3. `useUpupUpload` hook does not update when options change

**File:** `packages/react/src/use-upup-upload.ts` (line 56)

The `useEffect` has an empty dependency array (`[]`) and the `UpupCore` instance is created once with the initial options. If the consumer changes props (e.g., `accept`, `limit`, `maxFileSize`), the core will not be re-initialized. The comment `// eslint-disable-line react-hooks/exhaustive-deps` acknowledges this.

**Recommendation:** Either document this as intentional (one-time configuration) or implement an options-update mechanism. At minimum, add a JSDoc warning on `useUpupUpload` that options are read only at mount time.

### I4. `UploadManager.uploadAll` silently swallows individual file errors

**File:** `packages/core/src/upload-manager.ts` (lines 53-57)

When `onFileError` is not provided, individual upload failures are caught and silently ignored. The `uploadAll` promise resolves with partial results without indicating which files failed. This could lead to data loss where the user thinks upload succeeded.

**Recommendation:** When `onFileError` is not provided, either collect errors and reject the promise with an `AggregateError`, or make `onFileError` required.

### I5. `UploadManager.pause()` aborts and creates new controller but `resume()` does not restart uploads

**File:** `packages/core/src/upload-manager.ts` (lines 144-147, and `core.ts` lines 229-233)

`pause()` aborts the controller (cancelling in-flight uploads) and creates a new one, but `resume()` in `UpupCore` only changes the status -- it does not re-invoke `uploadAll()`. The paused uploads are effectively cancelled, not paused.

**Recommendation:** Either implement actual resumption logic or rename `pause`/`resume` to `cancel`/`restart` to set correct expectations. Alternatively, document the limitation.

### I6. `core.ts` pipeline uses `as any` for options and translation function

**File:** `packages/core/src/core.ts` (lines 167-169)

```typescript
options: this.options as any,
t: ((key: string) => key) as any,
```

The `PipelineContext.options` type is `Record<string, unknown>` and `CoreOptions` is an interface -- these should be compatible without `as any`. The `t` function provides a passthrough that returns the key unchanged, which loses the translation system entirely at the pipeline level.

**Recommendation:** Remove the `as any` casts. Pass the real `t` function if available, or define a proper no-op translator type.

---

## MINOR ISSUES / SUGGESTIONS

### S1. `shared/tsup.config.ts` targets ES2019 but `core` has no target specified

`shared` and `react` target ES2019, `server` targets Node 18, but `core` has no explicit target. This is inconsistent and could cause issues. Add `target: 'es2019'` to core.

### S2. `shared` sets `splitting: false` but `core` sets `splitting: true`

This is intentional (core has tree-shakeable sub-entries), but should be documented in the configs.

### S3. `WorkerPool` always falls back to main thread

**File:** `packages/core/src/worker-pool.ts` (line 36)

The comment says "Worker support will be enabled when inline worker code is bundled" but the class still maintains `workers` array and `workerAvailable` check that are never used. Consider removing dead code or adding a TODO with a tracking issue.

### S4. `PipelineEngine.processAll` is sequential, not parallel

**File:** `packages/core/src/pipeline/engine.ts` (lines 28-33)

Files are processed one at a time. For CPU-bound steps (hash, compress), this is fine. But for I/O-bound steps, `Promise.all` or a concurrency limiter would improve throughput. Consider adding a `concurrency` option.

### S5. Landing page install commands should include `@upup/server`

**File:** `apps/landing/src/components/HomepageHero/index.tsx` (lines 81-84)

Install commands show `@upup/react @upup/shared` but not `@upup/server`, which most users will also need.

### S6. `EventEmitter` lacks typed events

**File:** `packages/core/src/events.ts`

The emitter accepts `string` for event names and `unknown[]` for args. Defining a typed event map (`EventMap`) would catch typos and ensure correct payload shapes at compile time.

### S7. `UpupPlugin.setup` receives `unknown` instead of `UpupCore`

**File:** `packages/core/src/plugin.ts` (line 5)

Using `unknown` forces plugin authors to cast. Consider using a `UpupCorePublicAPI` interface or making the type generic.

### S8. Locales are duplicated across two export paths

Locales are exported from both `@upup/shared` (main entry) and `@upup/react/locales`. While the react version re-exports from shared (no duplication in source), consumers may be confused about which import path to use. The apps already show inconsistency: `en_US` is imported from `@upup/shared` while others come from `@upup/react/locales`.

---

## STRENGTHS

1. **Clean dependency graph:** The package split follows a proper layered architecture. `shared -> nothing`, `core -> shared`, `react -> shared + core`, `server -> shared + core`. No circular dependencies detected.

2. **Excellent build configuration:** Each package uses tsup with appropriate settings. Core has tree-shakeable sub-entries for pipeline steps. Server properly targets Node 18 with separate entry points per framework. React externalizes all peer dependencies.

3. **Well-designed type system:** The shared types (UploadFile, PipelineStep, PipelineContext, CredentialStrategy, UploadStrategy, RuntimeAdapter) form a coherent contract layer. The error hierarchy (UpupError -> UpupNetworkError, UpupValidationError, etc.) is well structured with error codes and retryability flags.

4. **No v1 naming leakage:** All new packages correctly use the v2 names (StorageProvider, FileSource, uploadEndpoint). Old names only remain in the legacy `packages/upup/` directory.

5. **No uuid dependency:** All new packages use `crypto.randomUUID()` or custom ID generation. No `express` imports in the server package (inline types used correctly for Express adapter).

6. **Solid server design:** The handler uses the Web `Request`/`Response` API as the universal interface, with thin framework adapters that convert to/from native types. This is a modern, maintainable pattern.

7. **Comprehensive i18n:** The Translations type has 198 keys covering every user-facing string with proper pluralization support (_one/_other suffixes).

8. **CSS isolation:** The PostCSS config properly prefixes all Tailwind classes with `upup-` and scopes them under `.upup-scope`, preventing style conflicts.

9. **All packages build successfully:** dist/ directories contain both ESM (.js) and CJS (.cjs) outputs with declaration files (.d.ts, .d.cts) and source maps.

10. **Reasonable bundle sizes:** shared (87KB), core (22KB), react (195KB), server (7KB) for ESM outputs. The react package is the largest but expected given the number of UI components.

---

## SUMMARY

| Category | Count |
|----------|-------|
| Critical | 4 |
| Important | 6 |
| Suggestions | 8 |

The v2 architecture is well-designed with a clean separation of concerns. The critical issues (React in shared, missing `files` field, type/null mismatches) are straightforward fixes that should be addressed before publishing to npm. The important issues around `any` usage and pause/resume semantics should be addressed in a fast-follow.
