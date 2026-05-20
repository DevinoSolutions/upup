# Shared Utilities Deduplication Plan

**Goal:** Centralize all framework-agnostic utilities from `@upup/react` and `@upup/vue` into `@upup/core` to eliminate duplication.

**Priority:** Medium — tech debt, not blocking. Both packages work correctly with local copies.

**Target date:** 2026-06-01 (after `@upup/vue` stabilizes and ships)

**Estimated effort:** 1.5 days

**Validated by:** graphify AST analysis (2026-05-18) — 2,778 nodes, 4,217 edges across packages/

---

## Problem

During the `@upup/vue` build, several pure-JS utility modules were copied verbatim from `@upup/react`. These have zero framework dependency — they should live in `@upup/core` so both adapters import from one source.

Graphify analysis confirmed: `cn()` is a god node (29 edges), `useFetchFileByUrl` helpers are duplicated across 5 shared functions, and 9 icon SVG paths are copied between packages.

## Phase 1 — Utility modules (byte-identical or near-identical)

| File (duplicated in react + vue) | What it does | Proposed core location | Diff status |
|---|---|---|---|
| `shared/lib/acceptPresets.ts` — `resolveAccept`, `ACCEPT_PRESETS` | Map preset names to MIME strings | `core/src/utils/accept-presets.ts` | byte-identical |
| `lib/status-helpers.ts` — `isUploadActive`, `isUploadIdle` | Upload status predicates | `core/src/utils/status-helpers.ts` | byte-identical |
| `assets/logos.ts` | Base64 cloud provider logo strings | `core/src/assets/logos.ts` | byte-identical |
| `lib/source-metadata.ts` — `sourceNameKeys` | FileSource → i18n translation key mapping | `core/src/utils/source-metadata.ts` | comment-only diff |
| `shared/lib/encoder.ts` — `b64EncodeUnicode` | Base64-encode unicode strings for file IDs | `core/src/utils/encoder.ts` | formatting diff only |
| `lib/tailwind.ts` — `cn()` | clsx + twMerge utility (29 edges, god node) | `core/src/utils/tailwind.ts` | import style diff only |
| `lib/file.ts` — `fileAppendParams`, `revokeFileUrl` | Annotate raw File with UploadFile fields | `core/src/utils/file-helpers.ts` | small diffs, reconcile |

## Phase 2 — Modules needing reconciliation

| File (duplicated in react + vue) | What it does | Proposed core location | Notes |
|---|---|---|---|
| `lib/image-editor-helpers.ts` | `dataURLtoBlob`, `blobToUploadFile` | `core/src/utils/image-helpers.ts` | React uses camelCase filename (`imageEditorHelpers.ts`) |
| `lib/resumable/multipartSessionStore.ts` | localStorage session persistence | `core/src/utils/multipart-session-store.ts` | React is SUPERSET — has `saveSession`, `updateSessionProgress`, `clearAllSessions` that Vue lacks. Use React's version. |

## Phase 3 — Newly discovered duplication (from graphify)

| Source | What it does | Proposed core location | Notes |
|---|---|---|---|
| `react/src/hooks/useFetchFileByUrl.ts` + `vue/src/composables/useFetchFileByUrl.ts` — 5 shared pure functions: `sanitizeFileName`, `extensionFromMime`, `fileNameFromContentDisposition`, `deriveFetchedFileName`, `MIME_EXTENSION_MAP` | URL-to-file conversion helpers | `core/src/utils/fetch-helpers.ts` | Framework hook wrappers stay in each package; only pure helpers move. Vue has extra `uuid()` that can use `crypto.randomUUID()` inline. |
| `react/src/components/Icons.tsx` + `vue/src/components/Icons.ts` — 9 shared icons: MyDeviceIcon, BoxIcon, DropBoxIcon, GoogleDriveIcon, OneDriveIcon, LinkIcon, CameraIcon, AudioIcon, ScreenCastIcon | SVG icon path data | `core/src/icons/icon-paths.ts` | Extract raw SVG path data as plain objects. React wraps in JSX, Vue wraps in `h()` — wrappers stay framework-specific. Vue has 11 extra icons (UI chrome) that stay in vue. |

## Also delete

| File | Reason |
|---|---|
| `vue/src/lib/folderDrop.ts` | Pure re-export of `@upup/core` — consumers should import directly |
| `react/src/lib/folderDrop.ts` | Same |

## Steps

1. Create each utility in `@upup/core/src/utils/` and `core/src/icons/`
2. Export from `@upup/core/src/index.ts`
3. Update `@upup/react` imports → `from '@upup/core'`
4. Update `@upup/vue` imports → `from '@upup/core'`
5. Delete duplicate files from both packages
6. For `useFetchFileByUrl`: extract pure helpers to core, keep framework hook wrappers
7. For icons: extract SVG path data objects to core, keep JSX/h() wrappers
8. Remove `pako` dep from `@upup/react` if `compressFile` moves too
9. Run full test suite + build across all packages
10. Single commit: `refactor: deduplicate shared utils into @upup/core`

## Not moving (framework-specific)

- `vue/src/lib/constants.ts` — `defineAsyncComponent` registry, Vue-specific
- `react/src/lib/constants.ts` — React `lazy()` registry
- `react/src/lib/googleDriveUtils.ts` — React-only Google Drive helpers
- `react/src/lib/storageHelper.ts` — React-only storage helper

## Investigated but NOT duplicated (false positives)

- `createPropGetters()` — graphify inferred Vue calls React's `prop-getters.ts`, but no import exists. False positive.
- OAuth plugins (`DropboxPlugin`, `BoxPlugin`, etc.) — all 4 already live in `packages/core/src/adapters/`. Structural duplication (shared method signatures) is a separate base-class refactor, not cross-package dedup.
- `useUploaderTheme()` — both packages have theme hooks but they're framework-specific wrappers around `core/src/theme/resolve-theme.ts` which is already centralized.

---

## Unnecessary Complexity (AI-agent confusion risks)

Issues found via graphify + manual audit that would confuse an AI agent (or human) working across packages.

### 1. Three-level barrel re-export chain in core

`core/index.ts` → `export * from './contracts'` → `contracts.ts: export * from './types'` → `types/index.ts: export * from './upload-file'` (8 sub-exports).

An agent needs to chase 3 levels of wildcards to find where `UploadFile` is actually defined. Grepping `export type UploadFile` finds `types/upload-file.ts`, but an agent might try `core/index.ts` or `contracts.ts` first.

**Fix:** Replace `export *` chains with explicit named exports in `core/index.ts`. One level, all symbols visible at the barrel.

### 2. `shared/types.ts` is a re-export + local type stew (both packages)

React's `shared/types.ts` (324 lines) and Vue's (213 lines) both:
- Import types from `@upup/core`
- Re-export some of those core types
- Define framework-specific types like `ImageEditorOptions`, `UpupUploaderProps`

The same type name (`ImageEditorOptions`) is defined locally in both files with near-identical shapes. An agent can't tell which is canonical — core's type? React's type? Vue's type?

**Fix:** Move shared type definitions (`ImageEditorOptions`, `UpupUploaderProps` base shape, `UploadSource`) to `@upup/core/src/types/`. Each package extends with framework-specific fields only. Stop re-exporting core types through shared/types — import directly from `@upup/core`.

### 3. Context shape types independently defined in both packages

`ContextUpload`, `ContextRuntime`, `ContextSource`, `ContextI18n`, `ContextFiles`, `ContextUploadControls`, `ContextView`, `ContextEditor`, `ContextTheme`, `ContextProps` are defined in BOTH:
- `react/src/context/RootContext.ts`
- `vue/src/context/root-context.ts`

They're structurally identical except Vue wraps some fields with `Ref<>`. An agent modifying one context shape won't know to update the other.

**Fix:** Define framework-agnostic context shapes in `@upup/core/src/types/context.ts`. Each package imports and adapts (Vue wraps with `Ref<>`, React uses as-is).

### 4. `useUpload` hook exists in React but not Vue

React has `hooks/useUpload.ts` — a thin wrapper extracting `upload`, `loading`, `error`, `progress`, `files` from `IRootContext`. Vue inlines this logic into `useRootProvider.ts`.

An agent porting features or tracing the upload flow across packages will search for `useUpload` in Vue and find nothing, concluding it's missing.

**Fix:** Either add `useUpload` composable in Vue for symmetry, or document that Vue inlines this into `useRootProvider`.

### 5. 8 Vue cloud components for 4 providers (unnecessary indirection)

Each cloud provider has TWO Vue components:
- `BoxUploader.vue` — 8-line wrapper: if server mode → `ServerModeDriveUploader`, else → `ClientBoxUploader`
- `ClientBoxUploader.vue` — actual OAuth implementation
- (× 4 providers = 8 files)

The wrappers are identical boilerplate with only the provider name changing. An agent modifying Box upload behavior might edit `BoxUploader.vue` (wrong file) instead of `ClientBoxUploader.vue`.

**Fix:** Single generic `CloudUploader.vue` with a `provider` prop that routes to server or client mode. Eliminates 4 boilerplate wrapper files.

### 6. Mixed file casing across packages

- React: `imageEditorHelpers.ts` (camelCase)
- Vue: `image-editor-helpers.ts` (kebab-case)
- React: `hooks/` directory
- Vue: `composables/` directory
- React context: `RootContext.ts` (PascalCase)
- Vue context: `root-context.ts` (kebab-case)

Grep-based agents searching for `image-editor-helpers` won't find React's version. Cross-package diffs fail silently.

**Fix:** Adopt one convention. Vue convention (kebab-case) is the Vue community standard; React convention (camelCase) is the React standard. At minimum, document the mapping.

### 7. React exports `cn` as public API

`react/src/index.ts` exports `cn` from `./lib/tailwind`. This is an internal utility (clsx + twMerge wrapper) exposed to consumers. An agent might treat it as a public contract that can't be moved.

**Fix:** Remove from public exports. Consumers needing `cn` should install `clsx` + `tailwind-merge` directly.

### 8. `checkFileType.ts` exists in React but not Vue

`react/src/shared/lib/checkFileType.ts` has no Vue equivalent. Unclear if Vue reimplements this inline or doesn't need it. An agent building a feature requiring file type checks in Vue won't find it.

**Fix:** If the logic is needed, move to `@upup/core`. If not, document why Vue doesn't need it.

---

## Structural Duplication & Bad Coupling (long-term risk)

These are larger than utility dedup — they're architectural patterns that will compound maintenance cost as the project grows.

### 9. Cloud hook event listeners are copy-pasted 8× (CRITICAL)

Each cloud provider hook (`useBox`, `useDropbox`, `useGoogleDrive`, `useOneDrive`) subscribes to 6 identical events:
```
core.on('{provider}:authenticated', ...)
core.on('{provider}:signed-out', ...)
core.on('{provider}:session-expired', ...)
core.on('{provider}:files-loaded', ...)
core.on('{provider}:state-change', ...)
core.on('{provider}:error', ...)
```

This pattern is **identical** between React and Vue (diff shows zero difference). It's also **identical** across all 4 providers — only the event prefix changes.

Total: 4 providers × 6 events × 2 frameworks = **48 `core.on()` calls** that are pure copy-paste.

**Impact:** Adding a new event (e.g. `{provider}:rate-limited`) requires editing 8 files. Missing one = silent bug in one provider on one framework.

**Fix:** Create `core/src/adapters/use-adapter-events.ts` — a framework-agnostic function that takes `(core, providerName, callbacks)` and wires up all 6 events. React/Vue hooks call this single function. Adding a new adapter event means changing 1 file.

### 10. `useRootProvider` is 1,561 lines of near-identical business logic (CRITICAL)

- React: `hooks/useRootProvider.ts` — **784 lines**
- Vue: `composables/useRootProvider.ts` — **777 lines**

These files contain identical business logic for: file management, upload orchestration, crash recovery, theme resolution, i18n setup, image editor control, SSE processing, pause/resume/cancel/retry, plugin registration.

The only differences are framework reactivity wrappers (`useState` vs `ref()`, `useCallback` vs plain functions, `useEffect` vs `onMounted`).

**Impact:** This is the single biggest maintenance cost in the project. Any core API change, new feature, or bug fix must be applied to BOTH files. An agent touching one will almost certainly miss the other.

**Fix (medium-term):** Extract a framework-agnostic `CoreOrchestrator` class in `@upup/core` that owns all business logic (file management, upload flow, crash recovery, plugin registration). React/Vue `useRootProvider` becomes a thin reactivity adapter (~100 lines each) that subscribes to orchestrator state changes and maps them to framework-specific reactivity primitives.

### 11. `useSSEProcessing` is duplicated

Nearly identical between React (`useRef` + `useCallback` wrapper) and Vue (composable). The SSE processing logic itself is framework-agnostic — it's just `SSEProcessor` from core with state tracking.

**Fix:** The `SSEProcessor` is already in core. Move the subscription/state-tracking logic into a framework-agnostic helper that both packages wrap.

### 12. `interactive-example` imports from `@upup/react` instead of `@upup/core`

```ts
import { ACCEPT_PRESETS } from '@upup/react'  // limits.ts:3
```

`ACCEPT_PRESETS` is a pure data structure with zero React dependency. This creates a false dependency: `interactive-example` → `@upup/react` when it should be → `@upup/core`.

Other `interactive-example` imports from `@upup/react` that are legitimate (React components like `UpupUploader`, React types like `UpupUploaderProps`) don't have this problem.

**Fix:** After moving `ACCEPT_PRESETS` to `@upup/core` (Phase 1 of this plan), update `interactive-example` to import from `@upup/core`.

### 13. Cloud hooks are duplicated 4× WITHIN each package

Even within a single package, `useBox`, `useDropbox`, `useGoogleDrive`, `useOneDrive` follow the exact same pattern:
1. Get core from context
2. Subscribe to 6 events
3. Map plugin state to local reactive state (user, files, path, auth token, etc.)
4. Expose authenticate/logout/navigate/select functions

The only variable is the provider name prefix and some provider-specific config (e.g. Google has `GisToken`, Box has `setPath`).

**Fix:** Create a generic `useCloudAdapter(providerName, core)` that handles the common event subscription and state management. Provider-specific hooks extend it with custom behavior. Cuts 4 hooks to 1 shared + 4 thin wrappers per package.

## Coupling Dependency Map (current state)

```
interactive-example → @upup/react → @upup/core
                      @upup/vue   → @upup/core
                      @upup/server (independent, only @upup/core types)
```

**Bad edges:**
- `interactive-example` → `@upup/react` for `ACCEPT_PRESETS` (should be → `@upup/core`)
- `react` re-exports core types through `shared/types.ts` instead of consumers importing from `@upup/core` directly
- `vue` does the same re-export pattern

**Ideal state after dedup:**
```
interactive-example → @upup/react (React components only)
                    → @upup/core  (shared types, presets, utilities)
@upup/react → @upup/core (thin reactivity adapter)
@upup/vue   → @upup/core (thin reactivity adapter)
```

---

## Additional Findings

### 14. Vue has ZERO tests (58 in React)

React has 58 test files covering utilities, hooks, accessibility, themes, SSR. Vue has none.

Many React tests (`encoder.test.ts`, `file-helpers.test.ts`, `cn-util.test.ts`, `resumable-session-store.test.ts`, `url-fetch-file-name.test.ts`, `image-editor-helpers.test.ts`, `sse-processing.test.ts`) test pure utility functions that are **identical** in Vue. When those utilities move to `@upup/core`, these tests should move with them — instantly giving Vue the same test coverage for free.

Tests that are React-specific (component rendering, prop-getters, JSX accessibility) stay in `packages/react/tests/`.

**Fix:** As part of each Phase 1–3 utility move, move the corresponding test file to `packages/core/tests/`. This is the highest-leverage testing win.

### 15. `tailwind.css` diverged — React has full stylesheet, Vue has bare minimum

React's `tailwind.css` (49+ lines) includes `@layer components` with custom scrollbar styles, shadow utilities, and animations. Vue's `tailwind.css` is just 3 lines (`@tailwind base/components/utilities`).

Either Vue is missing styles it needs (components will look wrong) or Vue handles these styles differently (e.g. scoped in SFC `<style>` blocks). An agent running Vue will see broken styling and not know why.

**Fix:** Audit which `@layer` rules Vue actually needs. If Vue components use `upup-shadow-wrapper` or `upup-preview-scroll` classes, the CSS must be there. Shared custom utility classes should live in a single `core/src/styles/upup-components.css` imported by both packages.

### 16. Ghost dependencies in React's `package.json`

These npm packages are listed as dependencies in `@upup/react` but are **never imported** in `packages/react/src/`:
- `@azure/msal-browser`
- `@microsoft/microsoft-graph-client`
- `dropbox`

The cloud adapter plugins in `@upup/core` load these SDKs dynamically via `load-script`, not npm `import`. These are dead dependencies inflating React's bundle/install.

**Fix:** Remove from React's `dependencies`. If needed at all, they should be `peerDependencies` of `@upup/core` (optional, since only used when the corresponding adapter is enabled).

### 17. `useLoadGAPI` is identical across packages

`react/src/hooks/useLoadGAPI.ts` and `vue/src/composables/useLoadGAPI.ts` both do `import load from 'load-script'` and load the Google API script. The logic is framework-agnostic.

**Fix:** Move to `@upup/core/src/utils/load-gapi.ts`. Both hooks become one-liners wrapping the core function.
