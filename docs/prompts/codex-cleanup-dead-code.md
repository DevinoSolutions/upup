# Codex Task: Clean up dead dependencies, dead files, and deduplicate FacingMode enum

## Context

This is a monorepo with three packages under `packages/`:
- `@upup/core` — framework-agnostic upload engine
- `@upup/react` — React adapter (imports from core)
- `@upup/vue` — Vue 3 adapter (imports from core)

The React and Vue packages should share all logic through `@upup/core`. During a cross-framework audit, we identified dead dependencies, dead files, and one duplicated enum that should be consolidated.

**Branch:** `v2-clean`

## Tasks

### 1. Remove dead dependencies from `packages/react/package.json`

Remove these three entries from the `dependencies` object in `packages/react/package.json`:

- `"truncate"` — zero imports anywhere in `packages/react/src/`. Only CSS class `upup-truncate` is used (Tailwind utility, not this npm package).
- `"use-debounce"` — zero imports anywhere in `packages/react/src/`.
- `"uuid"` — zero imports anywhere in `packages/react/src/`. Only an ambient `declare module 'uuid'` type shim exists at `packages/react/src/types/ambient.d.ts` — delete that file too if `uuid` is the only declaration in it.

After removing from `package.json`, run `pnpm install` from the repo root to update `pnpm-lock.yaml`.

### 2. Delete `packages/react/src/lib/googleDriveUtils.ts`

This file has zero imports — grep for `googleDriveUtils` across `packages/react/src/` to confirm before deleting. The Google Workspace MIME type export logic it contains already lives in `packages/core/src/adapters/google-drive-plugin.ts` as `WORKSPACE_EXPORT_MAP`.

### 3. Delete `packages/react/src/lib/storageHelper.ts`

This file defines `createSecureStorage()` but has zero imports — grep for `storageHelper` and `createSecureStorage` across `packages/react/src/` to confirm before deleting.

### 4. Delete `packages/vue/src/lib/folderDrop.ts`

Dead re-export file. It re-exports `collectDroppedFiles` and `DroppedFilesResult` from `@upup/core`, but nothing in the Vue package imports from this file. Grep for `folderDrop` across `packages/vue/src/` to confirm.

### 5. Move `FacingMode` enum to `@upup/core`

The `FacingMode` enum is defined identically in two places:
- `packages/react/src/hooks/useCameraUploader.ts`
- `packages/vue/src/composables/useCameraUploader.ts`

Both define:
```ts
export enum FacingMode {
    Environment = 'environment',
    User = 'user',
}
```

**Steps:**
1. Create `packages/core/src/types/facing-mode.ts` containing the `FacingMode` enum.
2. Add `export { FacingMode } from './types/facing-mode'` to `packages/core/src/index.ts` (place it near the other type exports like `FileSource`).
3. In `packages/react/src/hooks/useCameraUploader.ts`: remove the local `FacingMode` enum definition, add `import { FacingMode } from '@upup/core'`. Keep the `export { FacingMode }` so downstream consumers aren't broken (re-export from the import).
4. In `packages/vue/src/composables/useCameraUploader.ts`: same — remove local enum, import from `@upup/core`, re-export.
5. Verify that any file importing `FacingMode` from the React or Vue hook still works (the re-export preserves the public API).

## Verification

After all changes:

1. Run `pnpm install` from repo root.
2. Run `pnpm run build` (or `turbo run build`) — all three packages must build successfully.
3. Run `pnpm --filter @upup/core run test` — core tests must pass.
4. Run `pnpm --filter @upup/react run test` — react tests must pass.
5. Run `pnpm --filter @upup/vue run test` — vue tests must pass.
6. Grep to confirm no stale imports reference deleted files:
   - `grep -rn "googleDriveUtils" packages/react/src/` → should return nothing
   - `grep -rn "storageHelper\|createSecureStorage" packages/react/src/` → should return nothing
   - `grep -rn "from.*folderDrop" packages/vue/src/` → should return nothing
   - `grep -rn "from 'truncate'" packages/react/src/` → should return nothing
   - `grep -rn "from 'use-debounce'" packages/react/src/` → should return nothing
   - `grep -rn "from 'uuid'" packages/react/src/` → should return nothing

## Commit guidance

Create a single commit with message:
```
chore: remove dead deps/files, move FacingMode enum to core

- Remove unused deps from @upup/react: truncate, use-debounce, uuid
- Delete dead files: googleDriveUtils.ts, storageHelper.ts, vue/folderDrop.ts
- Move FacingMode enum to @upup/core for cross-framework sharing
```

## What NOT to change

- Do NOT modify any component logic, hooks, or composables beyond the FacingMode import change.
- Do NOT add new features or refactor existing code.
- Do NOT touch `react-webcam`, `react-filerobot-image-editor`, `pako`, or any other active dependency.
- Do NOT modify the Vue or React `index.ts` exports beyond what's needed for FacingMode.
