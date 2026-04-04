# upup v2.0 — Restart Brief

**Date:** 2026-04-04
**Context:** The `huge-refactor` branch implemented 86 features but broke the visual UI significantly. This document captures everything needed to restart cleanly.

---

## What the huge-refactor branch achieved (keep the knowledge)

### Architecture (GOOD — keep this design)
- 4-package monorepo: @upup/shared, @upup/core, @upup/react, @upup/server
- Dependency graph: shared → nothing, core → shared, react → core+shared, server → shared+core
- ESM + CJS dual output via tsup
- SSR-safe (useIsClient, deferred UpupCore init in useEffect)
- Tree-shakeable pipeline steps as subpath exports

### Core engine (GOOD — keep)
- UpupCore state machine: file management, pipeline, upload orchestration
- 6 upload strategies: DirectUpload, TokenEndpointCredentials, ServerCredentials, MultipartUpload, ServerOAuth, ServerTransfer
- Plugin system: .use(), registerExtension(), ext accessor, composeEnhancers()
- Pipeline engine with 7 built-in steps (hash, deduplicate, exif, compress, thumbnail, gzip, heic)
- Dynamic pipeline imports from boolean options
- WorkerPool with main-thread fallback
- CrashRecoveryManager with IndexedDB
- File validation: accept, size limits, dedup, async onBeforeFileAdded
- Nested restrictions + cloudDrives config objects
- Per-file overrides, validateFiles() public method
- isSuccessfulCall, fastAbortThreshold, apiKey managed mode

### i18n system (GOOD design, execution needs care)
- Nested UpupMessages type (13 namespaces)
- createTranslator() with ICU-style formatting and formatter cache
- LocaleBundle with metadata (code, language, dir)
- buildFallbackChain() for locale resolution
- 9 locale packs (en-US through zh-TW)
- BYO translator mode
- lang/dir on root element

### Server (GOOD — keep)
- Universal Web Request/Response handler
- 4 framework adapters (Next.js, Express, Hono, Fastify)
- AWS S3 presigned URL + multipart upload
- OAuth routes + file transfer routes
- Lifecycle hooks, TokenStore interface

### Theme system design (GOOD types, BAD execution)
- UpupThemeTokens, UpupThemeSlots types are well-designed
- resolveTheme() pipeline works
- CSS variable generation works
- Light + dark presets are correct

### Headless API (GOOD — keep)
- useUpupUpload hook: files, status, progress, 11 methods, on/ext, prop-getters
- UpupCore usable without React entirely
- All 22 components individually exported

---

## What went wrong (avoid these mistakes)

### 1. Component migration destroyed the visual UI
**What happened:** Plan 3 (Theme System) replaced all `dark ?` ternary branches and `classNames.*` references with CSS variable references and recipe calls. But the recipes were generated without seeing the actual rendered output — they were written to match the TYPE system, not the VISUAL design.

**Result:** The uploader lost its card appearance, source icons disappeared, branding footer was missing, and the overall layout broke.

**Lesson:** NEVER migrate component styling without a visual reference running side-by-side. The old UI must be visible in the browser while the new code is written. Screenshot-driven development, not type-driven.

### 2. CSS scoping class was dropped
**What happened:** The v1 root div had `className="upup-scope"` which is required because PostCSS scopes all Tailwind under `.upup-scope`. The v2 migration forgot to include it, causing zero styles to render.

**Lesson:** The `upup-scope` class is CRITICAL. It must be on the root element. Any component tree refactor must preserve it.

### 3. Source adapter case mismatch broke icon rendering
**What happened:** `sources` prop uses lowercase strings (`'local'`, `'camera'`) but `FileSource` enum uses uppercase (`'LOCAL'`, `'CAMERA'`). The adapter filter compared them directly, so no adapters matched and the icon grid was empty.

**Lesson:** When connecting user-facing string props to internal enums, always normalize case. Add a mapping function and test it.

### 4. v1 custom SVG icons were never migrated
**What happened:** v1 had `Icons.tsx` with custom SVG components (MyDeviceIcon, GoogleDriveIcon, OneDriveIcon, DropBoxIcon, etc.). The v2 migration never copied this file. An agent later tried to use `react-icons/tb` brand icons that don't exist (TbBrandDropbox, TbBrandGoogleDrive are not real exports).

**Lesson:** Copy ALL asset files (icons, images, SVGs) from v1 before starting any refactor. Verify react-icons exports exist before using them.

### 5. Agents working in parallel caused merge conflicts
**What happened:** Multiple agents edited the same files (upup-uploader.tsx, uploader-context.ts) simultaneously. Even with plans specifying execution order, agents didn't respect file boundaries.

**Lesson:** Assign strict file ownership per agent. Never let two agents touch the same file. Or work sequentially.

### 6. Plans were validated against types but not against rendered output
**What happened:** 6 rounds of plan validation checked type consistency, feature coverage, file conflicts. Zero rounds checked "does the UI still look right?" The plans were 100% type-correct but produced a broken visual experience.

**Lesson:** Plans must include visual acceptance criteria. "The uploader should render a card with source icons, drag text, and branding footer" is more important than "UpupThemeSlots maps all 72 classNames keys."

### 7. API keys were committed to source
**What happened:** An agent hardcoded Google/OneDrive/Dropbox credentials directly in a test page file and committed it. GitHub flagged the secret.

**Lesson:** NEVER put credentials in source files. Always use environment variables from day one, even in test apps.

### 8. Worktree branches diverged from target
**What happened:** Git worktrees for parallel execution branched off `master` instead of `huge-refactor`. Two of three agents worked against the wrong codebase.

**Lesson:** Verify worktree branch before starting work. Or don't use worktrees — sequential execution in the main repo is more reliable.

---

## Features to implement in the restart

### Tier 1: Package split + core (do first, DON'T touch React UI)
1. Scaffold 4 packages with correct dependency graph
2. Move shared types, enums, errors, strategy interfaces to @upup/shared
3. Move core engine (UpupCore, FileManager, PipelineEngine, UploadManager, etc.) to @upup/core
4. Move server handler + adapters to @upup/server
5. All tests must pass for these 3 packages before touching React

### Tier 2: React — COPY, don't rewrite
6. Copy ALL React component files from packages/upup/src/frontend/ to packages/react/src/
7. Copy Icons.tsx, all hooks, all adapters, all shared components
8. Update imports from old paths to @upup/shared and @upup/core
9. VERIFY THE UI RENDERS IDENTICALLY to v1 in the browser before proceeding
10. Take screenshots as baseline

### Tier 3: i18n upgrade (incremental, don't break UI)
11. Add createTranslator() and nested UpupMessages type to @upup/shared
12. Add i18n prop to UpupUploader ALONGSIDE existing locale/translations props
13. Migrate components to use t() ONE AT A TIME, verifying each in the browser
14. Only remove old props after all components are migrated and visually verified

### Tier 4: Theme system (incremental, don't break UI)  
15. Add UpupThemeTokens, presets, resolveTheme() to @upup/shared
16. Add CSS variable generation + injection on root element
17. Add theme prop to UpupUploader ALONGSIDE existing dark/classNames props
18. Migrate components to use CSS variables ONE AT A TIME, verifying each in the browser
19. Only remove dark/classNames after all components are migrated and visually verified

### Tier 5: New features (after UI is stable)
20. Headless hook improvements (on/ext direct, prop-getters, convenience callbacks)
21. Accessibility improvements (keyboard nav, focus management, aria-dropeffect)
22. Server OAuth routes + file transfer routes
23. New strategies (ServerCredentials, MultipartUpload, ServerOAuth, ServerTransfer)
24. Plugin system enhancements (composeEnhancers)
25. Core API additions (restrictions, cloudDrives, validateFiles, dynamic pipeline)

---

## Rules for the restart

### DO
- Work incrementally — one feature at a time, verify visually after each change
- Keep the old v1 UI running as a visual reference AT ALL TIMES
- Copy files first, then modify — never rewrite from scratch
- Take browser screenshots before and after every component change
- Use environment variables for ALL credentials from day one
- Run the full test suite + visual check after every commit
- One agent per task, sequential execution, no parallelism on shared files

### DON'T
- Don't do a "big bang" migration of all components at once
- Don't remove old props (dark, classNames, locale, translations) until the new system is verified
- Don't trust that types compile = UI works. TypeScript doesn't check visual appearance.
- Don't use react-icons brand icons without verifying they exist first
- Don't let agents modify files they haven't read first
- Don't commit credentials, even temporarily
- Don't use git worktrees for parallel work — they branch unpredictably
- Don't write 9,000 lines of plans before writing 1 line of code
- Don't validate plans 6 times against types while validating 0 times against rendered output

---

## Reference files from huge-refactor

These files from the huge-refactor branch are correct and can be reused:

### @upup/shared (reuse entirely)
- `src/types/` — UploadFile (with source, status, metadata), FileSource, StorageProvider, UploadStatus, errors
- `src/strategies.ts` — CredentialStrategy, OAuthStrategy, UploadStrategy, RuntimeAdapter interfaces
- `src/pipeline.ts` — PipelineStep, PipelineContext interfaces
- `src/errors.ts` — All error classes
- `src/i18n/` — createTranslator, UpupMessages type, 9 locale packs, resolve-locale
- `src/theme/` — UpupThemeTokens, presets, resolveTheme, CSS var helpers, slot types

### @upup/core (reuse entirely)
- `src/core.ts` — UpupCore with all options, restrictions, cloudDrives, apiKey wiring
- `src/file-manager.ts` — FileManager with validation
- `src/pipeline/` — PipelineEngine
- `src/upload-manager.ts` — UploadManager with concurrency, retries
- `src/strategies/` — All 6 strategy implementations
- `src/worker-pool.ts` — WorkerPool
- `src/crash-recovery.ts` — CrashRecoveryManager
- `src/events.ts` — EventEmitter
- `src/plugin.ts` — PluginManager
- `src/compose-enhancers.ts` — composeEnhancers utility
- All test files (121 tests passing)

### @upup/server (reuse entirely)
- `src/handler.ts` — Universal handler with OAuth + file transfer routes
- `src/next.ts`, `src/express.ts`, `src/hono.ts`, `src/fastify.ts` — Framework adapters
- All test files (15 tests passing)

### @upup/react (reuse selectively)
- `src/use-upup-upload.ts` — Headless hook (GOOD)
- `src/prop-getters.ts` — Prop-getter pattern (GOOD)
- `src/theme/` — ThemeProvider, useUpupTheme (GOOD types, BAD execution)
- `src/recipes/` — Slot recipes (need complete rewrite against actual CSS)
- `src/components/` — ALL need to be re-copied from v1 and incrementally migrated
- `src/components/Icons.tsx` — MUST be copied from v1 (custom SVGs)

### Test infrastructure (reuse)
- `apps/e2e-test/` — E2E test app structure with 12 pages (needs CSS fix)
- `apps/e2e-test/xpath-registry.yaml` — Selector registry
- 252 unit tests across all packages
