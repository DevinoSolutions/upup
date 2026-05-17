# Autonomous Adapter Migration — Execution Prompt

> **Usage:** Copy this entire prompt into a new Claude Code session on the `v2-clean` branch.
> Run with `/loop` (no interval — self-paced via ScheduleWakeup).

---

## Mission

Implement the adapter migration & type safety design spec at `docs/superpowers/specs/2026-05-17-adapter-migration-type-safety-design.md`. You work autonomously through 3 workstreams, testing each step in the browser via Chrome DevTools MCP before moving on. You do NOT stop until all workstreams pass and E2E tests are green.

## Rules

1. **Read the spec first** — `docs/superpowers/specs/2026-05-17-adapter-migration-type-safety-design.md` is your source of truth.
2. **Read the plan** — `docs/superpowers/plans/2026-05-17-cross-framework-portability.md` has context on what was already completed (Phases 1-6 are done).
3. **Use ScheduleWakeup** to self-pace. After completing each task, schedule a wakeup to continue. Use 60-90s delays to stay in cache. If waiting on a long build/test, use 270s.
4. **Use TodoWrite** to track every task. Mark each complete immediately. Never batch.
5. **Use Chrome DevTools MCP** (`mcp__chrome-devtools__*`) to visually verify adapter flows work in the playground after each adapter migration.
6. **Use subagents** (`Agent` tool) for implementation tasks. You are the coordinator — dispatch, review, commit.
7. **Never skip tests.** Run `pnpm --filter @upup/core run test` and `pnpm --filter @upup/react run test` after every change.
8. **Never skip typecheck.** Run `pnpm --filter @upup/core run typecheck` and `pnpm --filter @upup/react run typecheck` after every change.
9. **Commit after each completed task** with descriptive messages.
10. **If something breaks, fix it before moving on.** Use `superpowers:systematic-debugging` skill if stuck.

## Branch & Working Directory

- Working directory: `c:\Users\amind\OneDrive\Desktop\Projects\INTERNAL\upup`
- Branch: `v2-clean`
- Do NOT create a new branch. Work directly on `v2-clean`.

## Workstream Execution Order

### Phase 1: Type Safety (Workstream 1)

#### Task 1A: Type the EventEmitter

1. Read `packages/core/src/events.ts` to understand current EventEmitter implementation.
2. Read `packages/core/src/core.ts` to see all `.emit()` and `.on()` call sites — these define the event map.
3. Create `packages/core/src/types/core-events.ts` with a `CoreEvents` type map covering every event the core emits.
4. Make `EventEmitter` generic: `EventEmitter<TEvents extends Record<string, unknown> = Record<string, unknown>>`.
5. Update `UpupCore` to use `EventEmitter<CoreEvents>`.
6. Run typecheck + tests. Fix any breakage.
7. Commit: `refactor: add typed EventEmitter with CoreEvents map`

#### Task 1B: Remove `as never` casts from useRootProvider

1. Read `packages/react/src/hooks/useRootProvider.ts` — find all 28 `as never` casts.
2. For each cast, the typed EventEmitter should now provide the correct payload type. Replace `(payload: unknown) => { const x = payload as ... }` with properly typed destructuring.
3. Where prop callback signatures don't match event payloads, write typed adapter functions (1-3 lines each).
4. Run typecheck + tests.
5. Commit: `refactor: remove all as-never casts from useRootProvider`

#### Task 1C: Clean remaining `as any`/`as never` in React src

1. Grep for remaining `as any` and `as never` in `packages/react/src/` (exclude test files).
2. Fix each one. Files to check: `prop-getters.ts`, `lib/file.ts`, component files.
3. Run typecheck + tests.
4. Commit: `refactor: eliminate remaining unsafe casts in @upup/react`

**Checkpoint:** Run full build `pnpm run build:package`. Must pass.

### Phase 2: Adapter Migration (Workstream 2)

#### Task 2A: Shared adapter types

1. Create `packages/core/src/adapters/types.ts` with `DriveFile`, `AdapterState`, and adapter event type maps.
2. Export from `packages/core/src/index.ts`.
3. Commit: `feat: add shared adapter types (DriveFile, AdapterState)`

#### Task 2B: DropboxPlugin full implementation

1. Read `packages/react/src/hooks/useDropboxAuth.ts` (278 lines) — understand the full OAuth flow: popup, code polling, token exchange, token refresh.
2. Read `packages/react/src/hooks/useDropbox.ts` (219 lines) — understand SDK init, file listing, user info fetch.
3. Read `packages/react/src/hooks/useDropboxUploader.ts` (341 lines) — understand file download, folder traversal, file selection submission.
4. Read `packages/react/src/hooks/dropbox-types.ts` (30 lines) — understand Dropbox-specific types.
5. Rewrite `packages/core/src/adapters/dropbox-plugin.ts` with ALL logic from steps 1-4. The plugin must:
   - Own OAuth popup flow (window.open, polling)
   - Exchange auth code for tokens via Dropbox API
   - Refresh tokens when expired
   - Persist/restore tokens via sessionStorage
   - List files via `/files/list_folder` API
   - Download files via `/files/download` API
   - Traverse folders
   - Emit all `dropbox:*` events per the spec
6. Write `packages/core/tests/dropbox-plugin.test.ts` — mock fetch, mock window.open, mock sessionStorage. Test: auth flow, file listing, download, token refresh, error paths, session expired.
7. Run core tests.
8. Commit: `feat: DropboxPlugin full implementation with auth, file browse, download`

#### Task 2C: Thin useDropbox React hook

1. Rewrite `packages/react/src/hooks/useDropbox.ts` as a pure event subscriber (see spec for exact pattern).
2. Delete `packages/react/src/hooks/useDropboxAuth.ts`.
3. Delete `packages/react/src/hooks/useDropboxUploader.ts`.
4. Delete `packages/react/src/hooks/dropbox-types.ts`.
5. Update any imports in component files (`DropboxUploader.tsx`, etc.) to use the new hook.
6. Write `packages/react/tests/use-dropbox.test.ts` — renderHook, emit mock events, assert state.
7. Run react tests + typecheck.
8. Commit: `refactor: replace 3 Dropbox React hooks with thin useDropbox subscriber`

**Browser test checkpoint — Dropbox:**
1. Start dev server: `pnpm run dev:playground`
2. Use `mcp__chrome-devtools__navigate_page` to open the playground.
3. Use Chrome DevTools MCP to interact with the uploader — click Dropbox source.
4. Verify the auth popup opens (or verify the UI shows the Dropbox browser if already authed).
5. Take a screenshot with `mcp__chrome-devtools__take_screenshot` to verify visual state.
6. If broken, debug and fix before continuing.

#### Task 2D: GoogleDrivePlugin full implementation

Same pattern as 2B/2C:
1. Read `useGoogleDrive.ts` (231 lines) + `useGoogleDriveUploader.ts` (185 lines).
2. Rewrite `packages/core/src/adapters/google-drive-plugin.ts` with full gapi/picker logic.
3. Write core tests.
4. Rewrite `packages/react/src/hooks/useGoogleDrive.ts` as thin subscriber.
5. Delete `packages/react/src/hooks/useGoogleDriveUploader.ts`.
6. Write react hook test.
7. Browser test in playground.
8. Commit both.

#### Task 2E: OneDrivePlugin full implementation

Same pattern:
1. Read `useOneDriveAuth.ts` (251 lines) + `useOneDrive.ts` (122 lines) + `useOneDriveUploader.ts` (253 lines) + `usePCAInstance.ts`.
2. Rewrite `packages/core/src/adapters/one-drive-plugin.ts` with MSAL + Graph API logic.
3. Write core tests.
4. Rewrite `packages/react/src/hooks/useOneDrive.ts` as thin subscriber.
5. Delete `useOneDriveAuth.ts`, `useOneDriveUploader.ts`. Keep `usePCAInstance.ts` only if MSAL instance sharing is needed at React level — otherwise move to plugin.
6. Write react hook test.
7. Browser test in playground.
8. Commit both.

#### Task 2F: BoxPlugin full implementation

Same pattern:
1. Read `useBoxAuth.ts` (156 lines) + `useBox.ts` (62 lines) + `useBoxUploader.ts` (122 lines).
2. Rewrite `packages/core/src/adapters/box-plugin.ts`.
3. Write core tests.
4. Rewrite `packages/react/src/hooks/useBox.ts` as thin subscriber.
5. Delete `useBoxAuth.ts`, `useBoxUploader.ts`.
6. Write react hook test.
7. Browser test in playground.
8. Commit both.

#### Task 2G: Clean up useRootProvider adapter wiring

1. Update `useRootProvider.ts` — remove any references to deleted hooks.
2. Verify adapter registration (Task 5.6 from prior work) still works with the new full plugins.
3. Remove all resolved `// v2:` comments across the codebase.
4. Run full test suite.
5. Commit: `chore: clean up v2 TODO comments and adapter hook references`

**Checkpoint:** Full build + all tests.

### Phase 3: E2E Test Adjustments

#### Task 3A: Update E2E selectors and flows

1. Read `apps/playground/e2e/` — understand current E2E test structure.
2. Check if any E2E tests reference deleted hooks or changed component behavior.
3. Update E2E tests to match new adapter flow (single hook per adapter may change component rendering).
4. Run E2E tests: `pnpm --filter playground run test:e2e` (or however E2E is configured).
5. If E2E tests use specific selectors for adapter UI, update them.

#### Task 3B: Full browser smoke test

Use Chrome DevTools MCP to test EVERY adapter flow end-to-end in the playground:

1. **Local upload:** Drop a file → verify it appears → click upload → verify success.
2. **Dropbox:** Click Dropbox → verify auth popup → verify file browser → select file → verify download to uploader.
3. **Google Drive:** Same flow with Google picker.
4. **OneDrive:** Same flow with MSAL auth.
5. **Box:** Same flow.
6. **URL upload:** Paste a URL → verify fetch → verify file appears.
7. **Camera:** Open camera → capture → verify file appears.

For each: take a screenshot before and after to document the flow.

If ANY adapter breaks, fix it before claiming done.

#### Task 3C: Final verification

1. `pnpm run typecheck` (all packages)
2. `pnpm run test` (all packages)
3. `pnpm run build:package`
4. `pnpm --filter playground run build` (verify playground builds)
5. Grep for remaining `// v2:` comments — must be zero.
6. Grep for `as never` in `packages/react/src/` — must be zero (tests excluded).
7. Grep for `as any` in `packages/react/src/` — must be zero (tests excluded).

## ScheduleWakeup Pattern

After completing each task:

```
ScheduleWakeup({
    delaySeconds: 90,
    reason: "Completed [task name], continuing to [next task]",
    prompt: "<<autonomous-loop-dynamic>>"
})
```

After starting a long test/build in background:

```
ScheduleWakeup({
    delaySeconds: 270,
    reason: "Waiting for full test suite to complete",
    prompt: "<<autonomous-loop-dynamic>>"
})
```

## Failure Recovery

- If tests fail: read the error, fix the code, re-run. Do NOT skip failing tests.
- If typecheck fails: fix the type error. Do NOT add `as any` or `@ts-ignore`.
- If browser test shows broken UI: investigate with Chrome DevTools, check console errors, fix.
- If you're stuck for more than 2 iterations on the same issue: use `superpowers:systematic-debugging` skill.
- If an adapter's OAuth flow can't be tested (no API keys configured): verify the plugin code structurally (correct API URLs, correct request shapes, correct event emissions) and test with mocked fetch. Note which adapters need manual testing with real credentials.

## Success Criteria (copied from spec)

1. Zero `as never` or `as any` casts in `packages/react/src/` production code
2. All `// v2:` comments removed
3. Each cloud adapter works end-to-end in browser (or is verified structurally if no API keys)
4. React hook API is 1 hook per adapter (4 total, down from 12)
5. Plugin tests achieve >90% branch coverage on auth + file operations
6. `pnpm run build:package` succeeds
7. E2E tests pass (updated as needed)
8. All unit tests pass (core + react + server)
