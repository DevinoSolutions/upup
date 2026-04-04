# E2E Test Findings

**Date:** 2026-04-02
**Branch:** huge-refactor
**Server:** http://localhost:3335
**Tester:** Automated (Claude Code)

---

## Page-by-Page Results

### 1. /i18n -- PASS
- **Rendered:** i18n System page with locale toggle buttons (English/French), BYO Translator toggle, Override toggle, Clear Missing Keys button. File uploader widget present. Missing Keys Log shows 0 missing keys.
- **Console errors:** None
- **Console warnings:** React Router v7 future flag warnings (x2) -- benign
- **DX notes:** Clean layout. Missing keys log is a nice debugging aid.

### 2. /files -- PASS
- **Rendered:** File Operations page with buttons: Add test files, Remove first, Remove all, Reorder. File count: 0.
- **Console errors:** None
- **Console warnings:** React Router v7 future flag warnings (x2)
- **DX notes:** Clean and functional.

### 3. /upload -- PASS
- **Rendered:** Upload Lifecycle page showing Status: IDLE, progress bar at 0%/0/0, control buttons (Add test file, Upload, Pause, Resume, Cancel, Retry), Event Log with Clear log button.
- **Console errors:** None
- **Console warnings:** React Router v7 future flag warnings (x2)
- **DX notes:** Good coverage of upload lifecycle states. Upload won't complete without a backend, as expected.

### 4. /prop-getters -- PASS
- **Rendered:** Prop Getters page with dropzone area ("Drag files here or click to browse"), dragging state indicator, file count. Displays prop objects: `getDropzoneProps()` with full event handlers and ARIA attributes, and `getRootProps()`.
- **Console errors:** None
- **Console warnings:** React Router v7 future flag warnings (x2)
- **DX notes:** Excellent developer introspection -- showing the actual prop objects helps verify the headless API contract.

### 5. /plugins -- PASS
- **Rendered:** Plugin System page with buttons (Add file, Reset counter, Refresh count). Shows counter extension value: 0, files in core: 0. Lists registered plugins: "counter". Shows `composeEnhancers` result type: function.
- **Console errors:** None
- **Console warnings:** React Router v7 future flag warnings (x2)
- **DX notes:** Good plugin system visibility. Could benefit from showing plugin hook names.

### 6. /a11y -- PASS (with 1 a11y check failure)
- **Rendered:** Accessibility page with file uploader and A11y Checklist (Status: complete). Results: 8/9 passed.
- **Passing checks:** role="region" on dropzone, aria-live="polite" on file list, aria-dropeffect on dropzone, data-upup-slot attributes, data-state on root, data-theme on root, lang on root, dir on root.
- **FAILING check:** `role="progressbar" with aria-valuenow` -- progressbar element missing aria-valuenow attribute.
- **Console errors:** None
- **Console warnings:** React Router v7 future flag warnings (x2)
- **DX notes:** The built-in a11y checklist is a great feature. The progressbar issue should be fixed.

### 7. /sources -- PASS
- **Rendered:** All Sources page listing 8 configured sources: local, camera, url, google_drive, onedrive, dropbox, microphone, screen. File uploader present. Detected Visible Sources section shows 3 visible elements (browse files, Remove all files, Upload 0 files).
- **Console errors:** None
- **Console warnings:** React Router v7 future flag warnings (x2)
- **DX notes:** Good source enumeration. Visible element detection is useful for verifying which sources render UI.

### 8. /theme-provider -- PASS
- **Rendered:** Theme Provider page with two uploaders: first inherits provider theme (primary: #8b5cf6, purple), second has instance override (primary: #ef4444, red). Theme Detection Results confirms colors are different: YES.
- **Console errors:** None
- **Console warnings:** React Router v7 future flag warnings (x2)
- **DX notes:** Theme inheritance and override working correctly. Visual difference between uploaders is clear.

### 9. /restrictions -- PASS
- **Rendered:** Restrictions page showing config: maxNumberOfFiles: 3, maxFileSize: 1 MB, allowedFileTypes: image/*. Buttons: Add valid image, Add invalid type, Add oversized, Exceed limit, Validate files, Clear errors. Error Log and Validation Results sections present.
- **Console errors:** None
- **Console warnings:** React Router v7 future flag warnings (x2)
- **DX notes:** Good coverage of restriction scenarios with dedicated test buttons.

---

## Summary

| Page | Status | Console Errors | Notes |
|------|--------|---------------|-------|
| /i18n | PASS | 0 | Clean |
| /files | PASS | 0 | Clean |
| /upload | PASS | 0 | Upload requires backend (expected) |
| /prop-getters | PASS | 0 | Clean |
| /plugins | PASS | 0 | Clean |
| /a11y | PASS* | 0 | 1 a11y self-check fails (progressbar) |
| /sources | PASS | 0 | Clean |
| /theme-provider | PASS | 0 | Clean |
| /restrictions | PASS | 0 | Clean |

**Overall: 9/9 pages render, 0 console errors, 0 runtime errors**

---

## DX Issues Found

1. **No `data-testid` attributes observed** -- The uploader components rely on roles and ARIA attributes for selection, but explicit `data-testid` attributes would improve E2E test targeting.
2. **Prop Getters page functions display as "[Function]"** -- Consider showing function signatures or names for better developer introspection.
3. **Sources page "Detected Visible Sources"** shows button labels ("browse files", "Remove all files") rather than source type names -- could be confusing for developers expecting source identifiers.

---

## Blockers

~~1. a11y: progressbar missing aria-valuenow~~ -- **FALSE POSITIVE.** The progress bar component HAS `role="progressbar"` + `aria-valuenow` + `aria-valuemin` + `aria-valuemax` (verified in `progress-bar.tsx:40-44`). The self-check fails because the progress bar only renders inside FileList, which is hidden when 0 files are present. This is correct behavior — the progress bar is accessible when it appears.

**No actual blockers remaining.**

---

## Console Errors List

**Errors: 0**

**Warnings (all pages, non-blocking):**
- React Router Future Flag Warning: `v7_startTransition` -- appears on every page navigation. Benign; relates to React Router v6->v7 migration prep.
- React Router Future Flag Warning: `v7_relativeSplatPath` -- appears on every page navigation. Same category.

**Runtime Errors (console-ninja): 0**
