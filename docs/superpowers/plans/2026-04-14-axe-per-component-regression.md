# axe-core Per-Component Accessibility Regression Suite — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Lock in WCAG-level accessibility for each of v2-clean's 11 renderable components via a dedicated regression test file. Every component gets an individual axe scan so future changes can't silently introduce a11y violations in one component without breaking CI.

**Architecture:** Single new test file `packages/react/tests/accessibility-components.test.tsx`. Each component gets its own `describe` block containing one or more `axe()` scans scoped to that component's subtree via its stable `data-upup-slot` attribute. Components are rendered inside the real `<UpupUploader>` tree (no mock-context drift) and activated via Testing Library `userEvent` clicks on source buttons. The existing `tests/accessibility.test.tsx` stays unchanged (it owns MainBox structural ARIA assertions); the new file is the axe regression suite.

**Tech Stack:** `jest-axe` ^10.0.0 (already installed), `@testing-library/react` ^16.0.1, `@testing-library/user-event` ^14.6.1, `vitest` ^4.1.2, `jsdom` 22.1.0.

---

## File Structure

**Create:**
- `packages/react/tests/accessibility-components.test.tsx` — the regression suite.

**Modify:** none. The existing `tests/accessibility.test.tsx` stays as-is (structural ARIA tests for MainBox + ProgressBar). The new file is additive.

---

## Key Facts (verified from codebase)

- **Public components:** 11 unique (`MainBox`/`DropZone`, `AdapterSelector`/`SourceSelector`, `AdapterView`/`SourceView`, `CameraUploader`, `BoxUploader`, `DropboxUploader`, `GoogleDriveUploader`, `OneDriveUploader`, `UrlUploader`, `FileList`, `FilePreview`). All depend on `useRootContext()` so they must be rendered inside `<UpupUploader>`.
- **Source activation testids:** `[data-testid="upup-source-${id.toLowerCase()}"]` where `id` comes from the `UploadAdapter` enum (`internal`, `google_drive`, `one_drive`, `dropbox`, `box`, `link`, `camera`, `audio`, `screen`).
- **Slot selectors (verified present in source):** `main-box`, `adapter-selector`, `adapter-view`, `camera-uploader`, `box-uploader`, `dropbox-uploader`, `google-drive-uploader`, `onedrive-uploader`, `url-uploader`, `file-list`, `file-item`, `file-preview`, `progress-bar`, `image-editor`.
- **Required props for `<UpupUploader>` in tests:** `provider="s3"`, `serverUrl="https://example.com"` (used by the existing `accessibility.test.tsx` without errors).
- **Known exception already in use:** `nested-interactive` rule is disabled for MainBox because `role="button"` on the droppable region is a deliberate WAI-ARIA dropzone pattern.
- **ProgressBar exclusion:** ProgressBar only renders during an active upload. Deterministically triggering one in jsdom requires mocking the full upload strategy — out of scope for a11y regression. Its ARIA attributes are already covered in `tests/accessibility.test.tsx`.

---

## Task 1: Scaffold the test file + shared helpers

**Files:**
- Create: `packages/react/tests/accessibility-components.test.tsx`

- [ ] **Step 1: Create the test file with imports, axe setup, and shared helpers**

```tsx
import { describe, it, expect } from 'vitest'
import { render } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { axe, toHaveNoViolations, type JestAxeConfigureOptions } from 'jest-axe'
import React from 'react'
import { UpupUploader } from '../src'

expect.extend(toHaveNoViolations)

/**
 * Render <UpupUploader> with the minimum props needed across the suite.
 * Every component in this suite lives inside this tree — no mock context.
 */
function renderUploader(extra: Partial<React.ComponentProps<typeof UpupUploader>> = {}) {
    return render(
        <UpupUploader
            provider="s3"
            serverUrl="https://example.com"
            {...extra}
        />,
    )
}

/**
 * Scoped axe scan against a component's data-upup-slot subtree.
 * Returns the axe results object — callers assert `toHaveNoViolations()`.
 *
 * Why scoped: an unscoped scan of the whole <UpupUploader> tree would attribute
 * a violation in FileList to MainBox. Scoping to the slot subtree gives each
 * describe block a clean, per-component signal.
 */
async function scanSlot(
    container: HTMLElement,
    slot: string,
    overrides: JestAxeConfigureOptions = {},
) {
    const node = container.querySelector(
        `[data-upup-slot="${slot}"]`,
    ) as HTMLElement | null
    if (!node) {
        throw new Error(
            `scanSlot: no element with data-upup-slot="${slot}" found. ` +
                `Did the component render? Check activation steps.`,
        )
    }
    return axe(node, overrides)
}

/**
 * Click a source button by its UploadAdapter id (lowercased).
 * Valid ids: internal, google_drive, one_drive, dropbox, box, link, camera.
 */
async function activateSource(
    container: HTMLElement,
    sourceId: string,
    user = userEvent.setup(),
) {
    const btn = container.querySelector(
        `[data-testid="upup-source-${sourceId}"]`,
    ) as HTMLElement | null
    if (!btn) {
        throw new Error(
            `activateSource: no [data-testid="upup-source-${sourceId}"] found.`,
        )
    }
    await user.click(btn)
}
```

- [ ] **Step 2: Run the empty file to verify it transforms and test-collects**

Run: `cd packages/react && pnpm vitest run tests/accessibility-components.test.tsx`
Expected: `No test files found` OR `0 tests` (file loads cleanly, zero test failures). If TypeScript fails on imports, fix imports before proceeding.

- [ ] **Step 3: Commit the scaffold**

```bash
git add packages/react/tests/accessibility-components.test.tsx
git commit -m "test(react): scaffold per-component axe regression suite"
```

---

## Task 2: MainBox (DropZone) axe scan — default render state

**Files:**
- Modify: `packages/react/tests/accessibility-components.test.tsx`

- [ ] **Step 1: Append the MainBox describe block**

Add this block below the helpers:

```tsx
describe('axe — MainBox (DropZone)', () => {
    it('has no violations in default state', async () => {
        const { container } = renderUploader()
        const results = await scanSlot(container, 'main-box', {
            rules: {
                // role="button" on the droppable region + nested controls is the
                // WAI-ARIA dropzone pattern, not a violation.
                'nested-interactive': { enabled: false },
            },
        })
        expect(results).toHaveNoViolations()
    })
})
```

- [ ] **Step 2: Run the test**

Run: `cd packages/react && pnpm vitest run tests/accessibility-components.test.tsx -t "MainBox"`
Expected: PASS (MainBox is already axe-clean per existing suite).
If FAIL with violations: fix the component first. Do NOT disable rules beyond `nested-interactive` without team review.

- [ ] **Step 3: Commit**

```bash
git add packages/react/tests/accessibility-components.test.tsx
git commit -m "test(react): add axe scan for MainBox"
```

---

## Task 3: AdapterSelector (SourceSelector) axe scan — default render

**Files:**
- Modify: `packages/react/tests/accessibility-components.test.tsx`

- [ ] **Step 1: Append describe block**

```tsx
describe('axe — AdapterSelector (SourceSelector)', () => {
    it('has no violations in default state', async () => {
        const { container } = renderUploader()
        const results = await scanSlot(container, 'adapter-selector')
        expect(results).toHaveNoViolations()
    })
})
```

- [ ] **Step 2: Run test**

Run: `cd packages/react && pnpm vitest run tests/accessibility-components.test.tsx -t "AdapterSelector"`
Expected: PASS.
If FAIL: triage the violation in `packages/react/src/components/AdapterSelector.tsx`. Common causes: missing button `type="button"`, icon-only buttons without `aria-label`, low-contrast text.

- [ ] **Step 3: Commit**

```bash
git add packages/react/tests/accessibility-components.test.tsx
git commit -m "test(react): add axe scan for AdapterSelector"
```

---

## Task 4: UrlUploader axe scan — activate via Link source

**Files:**
- Modify: `packages/react/tests/accessibility-components.test.tsx`

- [ ] **Step 1: Append describe block**

```tsx
describe('axe — UrlUploader', () => {
    it('has no violations after activating Link source', async () => {
        const { container } = renderUploader()
        await activateSource(container, 'link')
        const results = await scanSlot(container, 'url-uploader')
        expect(results).toHaveNoViolations()
    })
})
```

- [ ] **Step 2: Run test**

Run: `cd packages/react && pnpm vitest run tests/accessibility-components.test.tsx -t "UrlUploader"`
Expected: PASS.
If FAIL with `label`/`form-field-multiple-labels` rule: add `aria-label` to the URL input in `packages/react/src/components/UrlUploader.tsx`.

- [ ] **Step 3: Commit**

```bash
git add packages/react/tests/accessibility-components.test.tsx
git commit -m "test(react): add axe scan for UrlUploader"
```

---

## Task 5: CameraUploader axe scan — activate via Camera source

**Files:**
- Modify: `packages/react/tests/accessibility-components.test.tsx`

- [ ] **Step 1: Append describe block**

```tsx
describe('axe — CameraUploader', () => {
    it('has no violations after activating Camera source', async () => {
        const { container } = renderUploader()
        await activateSource(container, 'camera')
        // CameraUploader wraps its UI in AdapterViewContainer — scope to the
        // camera-uploader slot, which lands on the outer container div.
        const results = await scanSlot(container, 'camera-uploader')
        expect(results).toHaveNoViolations()
    })
})
```

- [ ] **Step 2: Run test**

Run: `cd packages/react && pnpm vitest run tests/accessibility-components.test.tsx -t "CameraUploader"`
Expected: PASS.
If FAIL: `react-webcam` may emit a `<video>` without a `<track>` caption — for a camera preview this is acceptable; disable `video-caption` rule only if jest-axe flags it:

```tsx
const results = await scanSlot(container, 'camera-uploader', {
    rules: { 'video-caption': { enabled: false } },
})
```

- [ ] **Step 3: Commit**

```bash
git add packages/react/tests/accessibility-components.test.tsx
git commit -m "test(react): add axe scan for CameraUploader"
```

---

## Task 6: BoxUploader axe scan — auth-prompt state (no config)

**Files:**
- Modify: `packages/react/tests/accessibility-components.test.tsx`

- [ ] **Step 1: Append describe block**

```tsx
describe('axe — BoxUploader', () => {
    it('has no violations in auth-prompt state (missing clientId)', async () => {
        const { container } = renderUploader()
        await activateSource(container, 'box')
        const results = await scanSlot(container, 'box-uploader')
        expect(results).toHaveNoViolations()
    })
})
```

- [ ] **Step 2: Run test**

Run: `cd packages/react && pnpm vitest run tests/accessibility-components.test.tsx -t "BoxUploader"`
Expected: PASS. Without a `cloudDrives.box.clientId`, the component renders a `DriveAuthFallback` — the axe scan covers that fallback tree because it's nested inside the `box-uploader` slot.
If FAIL on `color-contrast` for the fallback text: fix in `packages/react/src/components/shared/DriveAuthFallback.tsx`.

- [ ] **Step 3: Commit**

```bash
git add packages/react/tests/accessibility-components.test.tsx
git commit -m "test(react): add axe scan for BoxUploader"
```

---

## Task 7: DropboxUploader axe scan — auth-prompt state

**Files:**
- Modify: `packages/react/tests/accessibility-components.test.tsx`

- [ ] **Step 1: Append describe block**

```tsx
describe('axe — DropboxUploader', () => {
    it('has no violations in auth-prompt state (missing clientId)', async () => {
        const { container } = renderUploader()
        await activateSource(container, 'dropbox')
        const results = await scanSlot(container, 'dropbox-uploader')
        expect(results).toHaveNoViolations()
    })
})
```

- [ ] **Step 2: Run test**

Run: `cd packages/react && pnpm vitest run tests/accessibility-components.test.tsx -t "DropboxUploader"`
Expected: PASS.

- [ ] **Step 3: Commit**

```bash
git add packages/react/tests/accessibility-components.test.tsx
git commit -m "test(react): add axe scan for DropboxUploader"
```

---

## Task 8: GoogleDriveUploader axe scan — auth-prompt state

**Files:**
- Modify: `packages/react/tests/accessibility-components.test.tsx`

- [ ] **Step 1: Append describe block**

```tsx
describe('axe — GoogleDriveUploader', () => {
    it('has no violations in auth-prompt state (missing clientId)', async () => {
        const { container } = renderUploader()
        await activateSource(container, 'google_drive')
        const results = await scanSlot(container, 'google-drive-uploader')
        expect(results).toHaveNoViolations()
    })
})
```

- [ ] **Step 2: Run test**

Run: `cd packages/react && pnpm vitest run tests/accessibility-components.test.tsx -t "GoogleDriveUploader"`
Expected: PASS.

- [ ] **Step 3: Commit**

```bash
git add packages/react/tests/accessibility-components.test.tsx
git commit -m "test(react): add axe scan for GoogleDriveUploader"
```

---

## Task 9: OneDriveUploader axe scan — auth-prompt state

**Files:**
- Modify: `packages/react/tests/accessibility-components.test.tsx`

- [ ] **Step 1: Append describe block**

```tsx
describe('axe — OneDriveUploader', () => {
    it('has no violations in auth-prompt state (missing clientId)', async () => {
        const { container } = renderUploader()
        await activateSource(container, 'one_drive')
        const results = await scanSlot(container, 'onedrive-uploader')
        expect(results).toHaveNoViolations()
    })
})
```

- [ ] **Step 2: Run test**

Run: `cd packages/react && pnpm vitest run tests/accessibility-components.test.tsx -t "OneDriveUploader"`
Expected: PASS.

- [ ] **Step 3: Commit**

```bash
git add packages/react/tests/accessibility-components.test.tsx
git commit -m "test(react): add axe scan for OneDriveUploader"
```

---

## Task 10: FileList axe scan — with files added

**Files:**
- Modify: `packages/react/tests/accessibility-components.test.tsx`

- [ ] **Step 1: Append describe block**

```tsx
describe('axe — FileList', () => {
    it('has no violations with files added', async () => {
        const { container } = renderUploader({
            // minFileSize must match buffer size: 2 KB passes the default unset minFileSize
        })
        const input = container.querySelector(
            '[data-testid="upup-file-input"]',
        ) as HTMLInputElement
        expect(input).not.toBeNull()

        // Two plaintext files, 2 KB each — enough for any minFileSize in defaults.
        const file1 = new File(
            [new Uint8Array(2048).fill(120)],
            'alpha.txt',
            { type: 'text/plain' },
        )
        const file2 = new File(
            [new Uint8Array(2048).fill(120)],
            'beta.txt',
            { type: 'text/plain' },
        )

        const user = userEvent.setup()
        await user.upload(input, [file1, file2])

        const results = await scanSlot(container, 'file-list', {
            rules: {
                // FileList footer buttons nest inside the list region; this is intentional.
                'nested-interactive': { enabled: false },
            },
        })
        expect(results).toHaveNoViolations()
    })
})
```

- [ ] **Step 2: Run test**

Run: `cd packages/react && pnpm vitest run tests/accessibility-components.test.tsx -t "FileList"`
Expected: PASS.
If FAIL with `list`/`listitem` rule: check `packages/react/src/components/FileList.tsx` is using `role="list"` on its container when file items use `role="listitem"`.
If FAIL with `button-name`: ensure Upload/Remove buttons have text or `aria-label`.

- [ ] **Step 3: Commit**

```bash
git add packages/react/tests/accessibility-components.test.tsx
git commit -m "test(react): add axe scan for FileList with files"
```

---

## Task 11: FilePreview axe scan — scoped to a single preview

**Files:**
- Modify: `packages/react/tests/accessibility-components.test.tsx`

- [ ] **Step 1: Append describe block**

```tsx
describe('axe — FilePreview', () => {
    it('has no violations for a single file preview', async () => {
        const { container } = renderUploader()
        const input = container.querySelector(
            '[data-testid="upup-file-input"]',
        ) as HTMLInputElement

        const file = new File(
            [new Uint8Array(2048).fill(120)],
            'preview.txt',
            { type: 'text/plain' },
        )

        const user = userEvent.setup()
        await user.upload(input, [file])

        // There is one file-preview per file; scope to the first.
        const preview = container.querySelector(
            '[data-upup-slot="file-preview"]',
        ) as HTMLElement
        expect(preview).not.toBeNull()

        const results = await axe(preview)
        expect(results).toHaveNoViolations()
    })
})
```

- [ ] **Step 2: Run test**

Run: `cd packages/react && pnpm vitest run tests/accessibility-components.test.tsx -t "FilePreview"`
Expected: PASS.
If FAIL with `image-alt`: ensure thumbnail `<img>` has an `alt` (file name or `""` for decorative) in `packages/react/src/components/FilePreview.tsx` or `FilePreviewThumbnail.tsx`.
If FAIL with `button-name` on remove/edit buttons: add `aria-label` for their icon-only states.

- [ ] **Step 3: Commit**

```bash
git add packages/react/tests/accessibility-components.test.tsx
git commit -m "test(react): add axe scan for FilePreview"
```

---

## Task 12: AdapterView (SourceView) axe scan — header region

**Files:**
- Modify: `packages/react/tests/accessibility-components.test.tsx`

**Note:** `AdapterView` is the header + active-adapter container that wraps every cloud drive / camera / url view. We want to scan it in isolation to catch header-level regressions (cancel button, icon, heading) without double-counting the inner adapter's violations. We activate the simplest inner adapter (Link) to mount AdapterView, then scan only the header element within `data-upup-slot="adapter-view"`.

- [ ] **Step 1: Append describe block**

```tsx
describe('axe — AdapterView (SourceView)', () => {
    it('has no violations in header region when any adapter is active', async () => {
        const { container } = renderUploader()
        await activateSource(container, 'link')

        const adapterView = container.querySelector(
            '[data-upup-slot="adapter-view"]',
        ) as HTMLElement
        expect(adapterView).not.toBeNull()

        // Scope to the header (first child div) so we don't re-scan the inner
        // UrlUploader — that's covered by Task 4.
        const header = adapterView.firstElementChild as HTMLElement
        expect(header).not.toBeNull()

        const results = await axe(header)
        expect(results).toHaveNoViolations()
    })
})
```

- [ ] **Step 2: Run test**

Run: `cd packages/react && pnpm vitest run tests/accessibility-components.test.tsx -t "AdapterView"`
Expected: PASS.
If FAIL with `button-name`: ensure the cancel button in `packages/react/src/components/AdapterView.tsx` has visible text (it does — `{tr.cancel}`).
If FAIL with `color-contrast` for the `#1b5dab` text on `black/[0.025]` background: triage whether contrast is genuinely below 4.5:1 in the rendered test DOM (jsdom has no real rendering, so color-contrast is typically not evaluated — a violation here is suspicious).

- [ ] **Step 3: Commit**

```bash
git add packages/react/tests/accessibility-components.test.tsx
git commit -m "test(react): add axe scan for AdapterView header"
```

---

## Task 13: Full-suite verification + roadmap memory update

**Files:**
- Modify: `C:\Users\amind\.claude\projects\c--Users-amind-OneDrive-Desktop-Projects-INTERNAL-upup\memory\project_upup_roadmap.md` (optional — only if the roadmap tracks a11y progress)

- [ ] **Step 1: Run the entire @upup/react test suite**

Run: `cd packages/react && pnpm vitest run`
Expected: All prior tests pass + 11 new axe tests pass. If any prior test broke, investigate before proceeding.

- [ ] **Step 2: Run the full monorepo test suite for safety**

Run (from repo root):
```
pnpm --filter "@upup/*" exec vitest run
```
Expected: All four packages green — `@upup/shared`, `@upup/core`, `@upup/react` (with 11 more tests than before), `@upup/server`.

- [ ] **Step 3: Build the react package to confirm no type regressions**

Run: `pnpm --filter @upup/react build`
Expected: `Build success` for ESM + CJS + DTS. Zero TS errors.

- [ ] **Step 4: Update roadmap memory (if tracked there)**

Check whether `memory/project_upup_roadmap.md` has an entry for "axe per-component regression" as deferred or in-progress. If it does, mark it complete. If it doesn't, no change needed.

- [ ] **Step 5: Commit (if memory was updated)**

```bash
# Only if memory was updated:
git add C:/Users/amind/.claude/projects/c--Users-amind-OneDrive-Desktop-Projects-INTERNAL-upup/memory/project_upup_roadmap.md
git commit -m "docs(memory): mark axe per-component regression suite complete"
```

---

## Self-Review

**Spec coverage:** Every component in the public export list is covered:
- MainBox/DropZone — Task 2
- AdapterSelector/SourceSelector — Task 3
- UrlUploader — Task 4
- CameraUploader — Task 5
- BoxUploader — Task 6
- DropboxUploader — Task 7
- GoogleDriveUploader — Task 8
- OneDriveUploader — Task 9
- FileList — Task 10
- FilePreview — Task 11
- AdapterView/SourceView — Task 12
- ProgressBar — intentionally excluded, rationale documented in "Key Facts"

**Placeholder scan:** Every task contains complete imports, full test code, exact commands, and specific troubleshooting guidance keyed to concrete rule IDs and file paths. No "TBD"/"fill in"/"similar to Task N".

**Type consistency:** Helper signatures are used identically in every task: `renderUploader(extra?)` returns the RTL render result, `scanSlot(container, slot, overrides?)` returns axe results, `activateSource(container, sourceId, user?)` returns `Promise<void>`. Slot names used in `scanSlot` calls (`main-box`, `adapter-selector`, `url-uploader`, `camera-uploader`, `box-uploader`, `dropbox-uploader`, `google-drive-uploader`, `onedrive-uploader`, `file-list`, `file-preview`, `adapter-view`) all match the verified list from `grep data-upup-slot`.

**Environment note:** This plan was NOT written inside a dedicated worktree (normally the brainstorming skill creates one before writing-plans). The implementer can decide whether to create a worktree (`git worktree add ../upup-axe-suite v2-clean-axe`) or work directly on v2-clean — the changes are purely additive test files and pose no risk to branch state.
