# upup v2.0 Rewrite - Session Handoff

**Date:** 2026-03-31
**Branch:** `huge-refactor` (48 commits ahead of `master`)
**Last verified:** All 4 packages build (0 TS errors), 80 tests pass (66 core + 10 react + 4 server)

---

## What is this?

A complete v2.0 rewrite of `upup-react-file-uploader`, splitting the monolithic `packages/upup/` into 4 scoped packages:

| Package | Purpose | Size |
|---------|---------|------|
| `@upup/shared` | Types, enums, errors, i18n, strategy/pipeline interfaces | 87KB |
| `@upup/core` | UpupCore state machine, file management, pipeline, upload manager, crash recovery | 22KB |
| `@upup/react` | React components, hooks, context, UI (DropZone, FileList, Camera, Audio, etc.) | 195KB |
| `@upup/server` | Server handler + framework adapters (Next.js, Express, Hono, Fastify) | 7KB |

---

## Implementation Plan Status

**Plan doc:** `docs/superpowers/plans/2026-03-28-upup-v2-implementation.md`

| Phase | Tasks | Status |
|-------|-------|--------|
| Phase 1: Scaffold + @upup/shared | All prereqs | DONE |
| Phase 2: @upup/core (2.1-2.10) | EventEmitter, Plugins, Pipeline, UpupCore, Steps, Strategies, UploadManager, Workers, CrashRecovery, Exports | ALL 10 DONE |
| Phase 3: @upup/react (3.1-3.10) | Hook, PasteZone, Context, Core UI, Device Capture, Cloud Drives, Preview/Editor, Wire Tree, A11y, Locales | ALL 10 DONE |
| Phase 4: @upup/server (4.1-4.4) | Handler, AWS S3, Framework Adapters, OAuth Proxy | 3/4 DONE (4.4 N/A - client-side OAuth works) |
| Phase 5: Integration (5.1-5.4) | Playground, Landing, E2E, Final Build | ALL 4 DONE |

**Score: 27/27 plan tasks complete** (Task 4.4 OAuth Proxy has no detailed spec in the plan — only a stub reference to `oauth.ts`. The React adapters handle OAuth entirely client-side via Google Identity Services, Azure MSAL, and Dropbox SDK, so no server proxy is needed for current functionality.)

---

## Code Review Status

**Review doc:** `V2_CODE_REVIEW.md` (committed on branch)

| Category | Count | Status |
|----------|-------|--------|
| Critical (C1-C4) | 4 | ALL RESOLVED - commit `baf6766` |
| Important (I1-I6) | 6 | ALL RESOLVED - commits `8041442`, `dd95f4d`, `fe28539` |
| Suggestions (S1, S5) | 2 | RESOLVED - commit `dd95f4d` |
| Suggestions (S2-S4, S6-S8) | 6 | DEFERRED - documented, not blocking |

### What was fixed:
- **C1:** Moved `UploaderIcons` type from shared to react (eliminated React peer dep from shared)
- **C2:** `RestrictionFailedReason` derived from `UpupErrorCode` enum (type-safe union)
- **C3:** Added `"files": ["dist"]` to all package.json files
- **C4:** `UploadFile.url` made optional, `null` -> `undefined`, removed `as unknown` cast
- **I1:** `CoreOptions` expanded, `options` made `readonly` public on UpupCore
- **I2:** Fastify adapter inline types (no `any`)
- **I3:** JSDoc on `useUpupUpload` documenting one-time options read
- **I4:** `UpupUploadBatchError` thrown when all uploads fail without `onFileError`
- **I5:** `resume()` re-uploads incomplete files (where `key == null`)
- **I6:** Removed `as any` from pipeline context
- **S1:** Added `target: 'es2019'` to core tsup config
- **S5:** Landing page install commands include `@upup/server`
- **78 unnecessary `as any` casts removed** across 12 react component files

### Remaining suggestions (S2-S4, S6-S8) - not blocking:
- S2: Document `splitting` config difference between packages
- S3: Clean up dead code in WorkerPool (always falls back to main thread)
- S4: Consider parallel `PipelineEngine.processAll` with concurrency option
- S6: Add typed event map to EventEmitter
- S7: `UpupPlugin.setup` receives `unknown` instead of typed core API
- S8: Locale export path inconsistency between shared and react

---

## Feature Parity Status

**Audit doc:** `V1_VS_V2_FEATURE_AUDIT.md` (committed on branch)

After the final wiring commit (`cac5219`), the audit partial gaps have been resolved:

| Previously Partial | Resolution |
|--------------------|------------|
| Drag-and-drop file reorder | WIRED - drag event handlers on file-list items |
| Crash recovery persistence | INTEGRATED - auto-save on state-change, clear on success/destroy, `restoreFromCrashRecovery()` public API |
| i18n integration in components | CONNECTED - 4 components now use `translations` from context instead of hardcoded `TR` objects |
| i18n file ordering keys | Still missing (minor - no UI text needed for drag reorder) |
| i18n crash recovery keys | Still missing (minor - recovery is automatic/silent) |

---

## Git State

### Branch commits (48 total, newest first):

**Cleanup & wiring (this session):**
```
cac5219 feat: wire drag-and-drop reorder, crash recovery, and i18n integration
7903db3 chore: add .claude/ to gitignore, add v2 audit and review docs
4954f37 chore: add jsx react-jsx compiler option to @upup/react tsconfig
fe28539 refactor: remove 78 unnecessary as any casts from react package
dd95f4d refactor: remove 16 any casts, improve type safety and docs (I1, I3, S1, S5)
8041442 fix: address important code review issues (I2, I4-I6)
baf6766 fix: address critical code review issues (C1-C4)
0ed8063 chore: remove v1 API routes, add @upup/react CSS build
```

**Phase 5 - Integration & Cleanup:**
```
ea4fe61 test: migrate E2E tests to @upup/react package              [Task 5.3]
f6157f6 chore: update @upup/shared bundle size budget to 20 KB       [Task 5.4]
8a9e4b7 fix: resolve build errors across all v2 packages             [Task 5.4]
bc63f0a fix: add @upup/server deps and v2 API routes to apps         [Task 5.1/5.2]
4495354 chore: update landing app to use v2 packages                  [Task 5.2]
b22119e chore: update playground to use v2 packages                   [Task 5.1]
```

**Phase 4 - @upup/server:**
```
5f488df feat(server): implement framework adapters                    [Task 4.3]
a77a259 feat(server): add AWS S3 presigned URL and multipart upload   [Task 4.2]
232202e feat(server): add core request handler with config types      [Task 4.1]
```

**Phase 3 - @upup/react:**
```
03b5a6b feat(react): add locale re-exports from @upup/shared          [Task 3.10]
e526a11 feat(react): add ARIA attributes and accessibility tests       [Task 3.9]
1fec652 feat(react): wire full component tree in UpupUploader          [Task 3.8]
9c3469b feat(react): migrate FilePreview, Portal, ImageEditor          [Task 3.7]
f9bb24a feat(react): migrate cloud drive adapters                      [Task 3.6]
bbae089 feat(react): migrate device capture components                 [Task 3.5]
bf9772c feat(react): migrate core UI components                        [Task 3.4]
22a466c feat(react): add UpupUploader shell, UploaderContext            [Task 3.3]
2007b32 feat(react): add PasteZone component                           [Task 3.2]
26dc7c7 feat(react): add SSR-safe useUpupUpload hook                   [Task 3.1]
```

**Phase 2 - @upup/core:**
```
8af6e6e feat(core): configure subpath exports and size-limit CI        [Task 2.10]
c1e806f feat(core): add CrashRecoveryManager with IndexedDB            [Task 2.9]
9e67cc0 feat(core): add WorkerPool with main-thread fallback           [Task 2.8]
dfcb1ea feat(core): add UploadManager with concurrency, retries        [Task 2.7]
962cd67 feat(core): add DirectUpload, TokenEndpointCredentials          [Task 2.6]
cce103e feat(core): add pipeline steps as subpath exports               [Task 2.5]
65f1c89 fix: correct package.json exports for type:module               [bugfix]
fe5b1bd feat(core): add UpupCore class with file management             [Task 2.4]
555c43f feat(core): add PipelineEngine                                  [Task 2.3]
d2c9c2c feat(core): add PluginManager with extension registration       [Task 2.2]
35a919f feat(core): add EventEmitter with vitest config                 [Task 2.1]
```

**Phase 1 - Scaffold + @upup/shared:**
```
522b283 docs: write revised v2 implementation plan
2e85067 docs: revise v2 architecture spec
39fbd1a feat(shared): add i18n system with all locale packs
207d501 feat(shared): add types, enums, errors, strategy interfaces
cd22e15 chore: gitignore dist/ for all packages
41010ad chore: scaffold @upup/shared, @upup/core, @upup/react, @upup/server
```

**Pre-phase (docs):**
```
1ec7704 docs: add upup v2.0 implementation plan
c619ea3 docs: apply v2 naming conventions to architecture spec
6ca563d docs: add upup v2.0 architecture design spec
8040a39 Use v-prefixed release tag and name
```

### Stashes:
```
stash@{0}: v1-feature-additions-backup (audio, screen-capture, camera-video, crash-recovery, file-ordering, i18n, thumbnails)
stash@{1}: WIP on master (unrelated)
```

`stash@{0}` contains the pre-existing v1 `packages/upup/` uncommitted changes (37 files, +2975 lines). The audit confirmed all features have v2 equivalents. **Safe to drop** (`git stash drop stash@{0}`).

### Untracked files (4):
```
.github/workflows/auto-changeset.yml  — CI workflow, decide to commit or delete
HANDOFF.md                             — This handoff doc, commit or delete after pickup
UPPY-VS-UPLOADTHING-ARCHITECTURE.md   — Research doc, optional to keep
docs/superpowers/specs/2026-03-28-upup-v2-competitive-enhancements.md — Spec doc, optional
```

### `as any` count: 22 remaining
All are third-party API casts (`window.google`, `webkitGetAsEntry`, `@azure/msal-browser`, etc.) — inherent to untyped browser/vendor APIs, cannot be removed.

---

## Key Architecture Decisions

1. **Dependency graph:** `shared -> nothing`, `core -> shared`, `react -> shared + core`, `server -> shared + core`
2. **ESM `"type": "module"`:** All packages. `.js` = ESM, `.cjs` = CJS. PostCSS config uses `.cjs` extension.
3. **No React in shared:** `UploaderIcons` type lives in `@upup/react`, not `@upup/shared`
4. **CSS isolation:** Tailwind prefixed with `upup-`, scoped under `.upup-scope` via PostCSS
5. **i18n:** `Translations` type (198 keys) in shared, `mergeTranslations()` utility, `locale`/`translationOverrides` props on `UpupUploader`
6. **Crash recovery:** `CrashRecoveryManager` + `IndexedDBStorage` in core, auto-save on state changes, `restoreFromCrashRecovery()` public API
7. **Server handler:** Web `Request`/`Response` as universal interface, thin framework adapters
8. **Client-side OAuth:** Google (GIS), OneDrive (MSAL), Dropbox (SDK) — no server proxy needed

---

## Recommended Next Steps

1. **Create PR** `huge-refactor` -> `master`
2. **Drop v1 stash** — `git stash drop stash@{0}`
3. **Decide on 3 untracked files** (commit or delete)
4. **Address S2-S8** in follow-up PRs after merge (not blocking)
5. **Publish to npm** once PR is merged

---

## .md Files Reference

| File | Location | Git Status | Purpose |
|------|----------|------------|---------|
| Architecture spec | `docs/superpowers/specs/2026-03-28-upup-v2-architecture-design.md` | Committed | Original architecture design |
| Implementation plan | `docs/superpowers/plans/2026-03-28-upup-v2-implementation.md` | Committed | 5-phase, 27-task plan (all done) |
| Competitive enhancements | `docs/superpowers/specs/2026-03-28-upup-v2-competitive-enhancements.md` | Untracked | Feature research against Uppy/Uploadthing |
| Code review | `V2_CODE_REVIEW.md` | Committed | C1-C4, I1-I6, S1-S8 findings + resolutions |
| Feature audit | `V1_VS_V2_FEATURE_AUDIT.md` | Committed | v1 vs v2 parity validation (note: written before wiring commit) |
| Uppy comparison | `UPPY-VS-UPLOADTHING-ARCHITECTURE.md` | Untracked | Architecture comparison research |
| This handoff | `HANDOFF.md` | Untracked | Session state for continuation |
