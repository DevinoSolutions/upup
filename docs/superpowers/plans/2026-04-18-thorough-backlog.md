# v2-clean — thorough backlog

**Date:** 2026-04-18
**Branch:** v2-clean (263 commits ahead of master, 16 new commits this session)
**Scope:** Full survey — playground, packages, consumer apps, feature plans, shipping prep.

Three parallel audits fed this list: a live DevTools walkthrough of the
playground, a `TODO`/`FIXME`/`@deprecated`/`as any` grep across the tree,
and a landing + docs + release state check.

---

## 🔴 P0 — Real blockers (stuff that's broken)

### P0-1. Six consumer-app files still use removed v1 props

TypeScript should have exploded on these; it didn't because the landing /
playground / e2e-test packages had other pre-existing errors that masked
the import-time failures during `pnpm typecheck`. They either currently
fail to compile or will at build time.

| File | Prop | Line(s) |
|---|---|---|
| `apps/landing/src/app/mobile-demo/page.tsx` | `limit`, `shouldCompress` | 87, 92 |
| `apps/landing/src/components/HomepageDemo/index.tsx` | `limit`, `shouldCompress` | 739, 744 |
| `apps/landing/src/components/Toast.tsx` | `limit` | 12 |
| `apps/landing/src/components/Uploader.tsx` | `classNames` | 112 |
| `apps/playground/src/app/mobile-demo/page.tsx` | `limit`, `shouldCompress` | 109, 114 |
| `apps/playground/src/components/Toast.tsx` | `limit` | 11 |
| `apps/playground/src/components/Uploader.tsx` | `classNames` | 106 |
| `apps/e2e-test/src/main.tsx` | `limit` | 41 |

**Fix:** migrate to `maxFiles`, `imageCompression`, `theme.slots`.
Estimate: **~45 min**. Blocks any `pnpm build` of landing / playground.

### P0-2. Stories in `packages/upup/` use removed props

`packages/upup/stories/UploaderWith*.stories.tsx` (three files) pass
`dark={...}`. These storybook stories may be importing from the legacy
v1 surface — verify whether `packages/upup` is a shipped package or a
pre-v2 remnant before deciding to delete vs migrate. Estimate: **~15 min**
once policy is decided.

---

## 🟠 P1 — High-value, one sitting each

### P1-1. Migrate remaining 16 hardcoded strings through i18n

Plan `2026-04-02-plan2-i18n-system.md` shipped the ICU translator + locale
bundles, but 6 React components still hardcode English UI copy:
`source-selector`, `main-box-header`, `file-list`, `drive-auth-fallback`,
`drive-browser-header`, `use-dropbox`. Closes the largest remaining gap
against feature #57 of the V2 spec. Estimate: **~1 hr**.

### P1-2. Dropbox auth typings + error handling

The `TODO/@deprecated` scan flagged two distinct issues clustered in
Dropbox:
- 6 `console.error` calls in `useDropboxAuth` / `useDropbox` that log but
  never surface to the UI.
- 2 `@ts-expect-error` directives in the Dropbox flow because the SDK's
  types are incomplete — blocks typed error handling.

Estimate: **~1.5 hr** to type the Dropbox SDK surface and route errors
through the existing `onError` callback chain.

### P1-3. `data-upup-slot` attribute on every component

Currently only 5 components emit `data-upup-slot` (root, main-box,
adapter-selector, file-list, progress-bar, header, file-item). Feature
#46 in the V2 spec expected all 22. Needed for consumers who want to
query-select or style by slot. Estimate: **~2 hr**.

### P1-4. File-replacement handler stub

`packages/react/src/hooks/useRootProvider.ts:668` — "not implemented
yet." It's the path that would let consumers replace a file mid-upload
(e.g., after image-editor save). Check whether the existing
`saveImageEdit` path already covers this and the stub is dead, or
whether it's a real gap. Estimate: **~30 min** to investigate + document
or fix.

---

## 🟡 P2 — Nice polish

### P2-1. 44 playground fields have no inline description

DevTools walkthrough showed only ~15/44 controls carry a description
tooltip. Provider, Max concurrent uploads, Max retries, Chunk size,
Mode, most Appearance entries have label only. Estimate: **~1 hr** to
fill in pragmatic one-liners.

### P2-2. Accessibility regression suite

Plan `2026-04-14-axe-per-component-regression.md` scaffolded a
`scanSlot()` helper and `activateSource()` stub but no test files exist.
Prevents a11y regressions across the 22 components. Estimate: **~3 hr**
for the framework + a first batch of ~10 components.

### P2-3. CoreOptions shape alignment

Spec originally designed nested shapes:
`restrictions: { maxFileSize, maxFiles, allowedTypes }`,
`cloudDrives: { googleDrive, oneDrive, dropbox }`,
`metadata: { width, height, duration, thumbnailUrl, … }`.
Current code keeps flat props. Both work — but the nested shape is the
documented public API. Estimate: **~2 hr** to align + migration guide.

### P2-4. Server strategies 3-6

Plan `2026-04-02-plan4-server-strategies.md`: 2/6 strategies shipped
(TokenEndpoint, DirectUpload). Missing: ServerCredentials (partially
there in code but not exported), ClientOAuth, ServerOAuth,
ServerTransfer, MultipartUpload. Cloud-drive OAuth routes not wired.
Estimate: **~6 hr** — biggest item on this list.

---

## 🟢 P3 — Shipping prep (when you decide to publish)

### P3-1. CHANGELOG.md

Sixteen new commits since npm v2.0.0 (2026-03-16). Needs a structured
CHANGELOG covering:
- **BREAKING** (Tier A+B prop removals, classNames removal)
- **Features** (theme.slots wired, interactive-example polish, segmented
  controls, event log panel, preset bar, color picker, quality slider)
- **Fixes** (#42 i18n, #68 core types, SSR hydration, playground stale
  lock)

Estimate: **~45 min**.

### P3-2. v2.0.0 → v2.1.0 migration guide

One-page md explaining:
- How to replace `dark` with `theme.mode`
- How to replace `limit` with `maxFiles`
- How to replace `shouldCompress` with `imageCompression`
- How to replace `classNames={...}` with `theme.slots={...}`
- How to subscribe to events (no change)

Estimate: **~45 min**. Lives at `apps/docs/docs/migration/v2-to-v2.1.md`.

### P3-3. Package version bumps + changeset

Three packages need minor bumps: `@upup/react`, `@upup/shared`,
`@upup/core` (the first two for breaking changes, core for the
CoreOptions.locale/translations typing — arguably breaking for anyone
passing `unknown`). Estimate: **~15 min**.

### P3-4. E2E Playwright re-run

The v2-clean branch has shifted the API twice (Tier A + Tier B). The
existing Playwright suite in `apps/e2e-test/e2e/` may have drift — at
minimum `restrictions.spec.ts` still references `limit`. Estimate:
**~1 hr** depending on how many specs break.

---

## 🔵 Already shipped (receipts)

Since master (last 16 commits, all on v2-clean):

```
072ba95 feat(interactive-example): color picker, quality slider, grouped Events
a3fcfdc refactor(interactive-example): default-value visibility + behavior dedup
f59a6b9 refactor(interactive-example): inline Size+Unit rows in Limits
a1a8abd feat(interactive-example): live event log panel under the preview
d201d84 feat(interactive-example): brand icons on sources + cloud credentials
5fe8220 fix(v2-spec): close #42 (Paused i18n) + #68 (CoreOptions.locale types)
b874f6d refactor(interactive-example): presets use icons + plain copy
8edd26e feat(interactive-example): preset bar + collapse-by-default sidebar
4f6cebc refactor(interactive-example): Advanced-split + segmented enum controls
fe036cb feat(@upup/shared,@upup/react): wire theme.slots end-to-end, remove classNames
710532f feat(@upup/react): drop v1 legacy props (dark, limit, shouldCompress)
```

V2 spec status: 86/86 DONE.

---

## Suggested order of attack

1. **P0-1** — consumer-app migrations (unblocks builds) — 45 min
2. **P0-2** — stories policy decision + migration — 15 min
3. **P1-1** — i18n hardcoded strings — 1 hr
4. **P2-1** — playground descriptions — 1 hr
5. **P1-3** — data-upup-slot everywhere — 2 hr
6. **P3-1 + P3-2** — CHANGELOG + migration guide — 1.5 hr
7. Everything else as time permits; P2-4 (server strategies) is its
   own multi-day thing and should probably be a separate sprint.

Total P0 + P1 + P3 prep: ~7 hrs. That's a realistic "get this ready
for publishing" afternoon.
