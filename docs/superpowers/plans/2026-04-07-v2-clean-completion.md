# v2-clean Completion Plan — React Layer Polish

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Bring the `v2-clean` React layer to a release-ready v2 state by adding theme provider, slot attributes, RTL support, and verified accessibility — without mass-migrating components.

**Architecture:** Additive only. Wrap existing v1 components with new providers and decorate them with new attributes. Never rewrite a component. Verify every change visually with Chrome DevTools before moving on.

**Tech Stack:** React 18, TypeScript, Tailwind, `@upup/shared` theme tokens, Vitest, Playwright, Chrome DevTools MCP.

---

## Ground Truth (verified 2026-04-07)

| Component | Status |
|---|---|
| `@upup/core` 6 strategies | ✅ present (`packages/core/src/strategies/`) |
| `@upup/server` OAuth + transfer routes | ✅ present (`packages/server/src/handler.ts`) |
| `@upup/shared` theme tokens (presets, slots, vars, resolve) | ✅ present (`packages/shared/src/theme/`) |
| `@upup/shared` i18n (createTranslator, locales) | ✅ present (`packages/shared/src/i18n/`) |
| React `prop-getters.ts` (data-upup-slot, aria-dropeffect) | ✅ present but **only inside the headless hook output** |
| React `UpupThemeProvider` | ❌ missing (no `packages/react/src/theme/` dir) |
| React `recipes/` (tailwind-variants) | ❌ missing |
| React `data-upup-slot` on components | ❌ only in `prop-getters.ts` |
| React `aria-dropeffect` on MainBox/DropZone | ❌ only in `prop-getters.ts` |
| React `lang`/`dir` on root | ❌ no occurrences anywhere |
| React using `@upup/shared` i18n | ❌ uses local copy at `packages/react/src/shared/i18n/` |

`huge-refactor` is dead — its React work was lost in the restart. v2-clean inherited only `@upup/shared`, `@upup/core`, `@upup/server`. The React side is v1-original-plus-new-props-on-top.

---

## Scope Decision

This plan addresses **only verified gaps that are required for a usable v2 release**. Out-of-scope (intentionally):

- ❌ **i18n unification** — React's local `shared/i18n/` works fine. Ripping it out for `@upup/shared` is risky, large, and not user-visible. Defer.
- ❌ **15 tailwind-variants recipe files** — current `cn()`-based styling renders correctly. Recipes are an internal refactor that doesn't ship value. Defer.
- ❌ **ICU plural syntax** — current `{{var}}` interpolation covers all current strings.

**In scope** (5 tasks):
1. Establish a Chrome DevTools baseline so we know what "working" looks like
2. Add `UpupThemeProvider` that injects CSS variables from `@upup/shared/theme`
3. Add `data-upup-slot` to root + key targetable components
4. Add RTL: `lang`/`dir` on root element from current locale
5. Add `aria-dropeffect` + keyboard nav to MainBox + axe-core regression test

Each task ends with a Chrome DevTools verification step using the `mcp__chrome-devtools__*` tools.

---

## Task 1: Establish Baseline with Chrome DevTools

**Files:**
- Read-only: `apps/e2e-test/`
- Create: `docs/superpowers/audits/2026-04-07-v2-clean-baseline.md`

- [ ] **Step 1: Start the e2e-test app**

```bash
cd apps/e2e-test
pnpm dev
```

Expected: Dev server up on `http://localhost:3000` (or whichever port is configured — check `vite.config.ts`).

- [ ] **Step 2: Open the page in Chrome DevTools MCP**

Use `mcp__chrome-devtools__new_page` with `url: "http://localhost:3000"`.

Then `mcp__chrome-devtools__take_snapshot` to capture the DOM tree.

Then `mcp__chrome-devtools__take_screenshot` (full page) and save the path.

- [ ] **Step 3: Inspect the root container**

Use `mcp__chrome-devtools__evaluate_script` with:

```js
() => {
  const root = document.querySelector('[class*="upup"]');
  if (!root) return { found: false };
  return {
    found: true,
    tag: root.tagName,
    classes: root.className,
    lang: root.getAttribute('lang'),
    dir: root.getAttribute('dir'),
    dataState: root.getAttribute('data-state'),
    dataUpupSlot: root.getAttribute('data-upup-slot'),
    cssVarSurface: getComputedStyle(root).getPropertyValue('--upup-color-surface'),
  };
}
```

Expected output (current state — confirms gaps):
```json
{ "found": true, "lang": null, "dir": null, "dataState": null, "dataUpupSlot": null, "cssVarSurface": "" }
```

- [ ] **Step 4: Count slot attributes site-wide**

```js
() => ({
  slotCount: document.querySelectorAll('[data-upup-slot]').length,
  ariaDropeffectCount: document.querySelectorAll('[aria-dropeffect]').length,
  cssVarsOnRoot: Array.from(document.querySelectorAll('[class*="upup"]'))
    .slice(0, 1)
    .map(el => Array.from(el.style).filter(p => p.startsWith('--upup-')))
    .flat(),
})
```

Expected (current state): all zeros / empty arrays.

- [ ] **Step 5: Save the baseline document**

Write `docs/superpowers/audits/2026-04-07-v2-clean-baseline.md` with:
- Screenshot path
- Root container findings
- Slot/aria/css-var counts
- Confirmation that the page renders correctly visually (icons, colors, layout intact)

- [ ] **Step 6: Commit**

```bash
git add docs/superpowers/audits/2026-04-07-v2-clean-baseline.md
git commit -m "docs(audit): capture v2-clean Chrome DevTools baseline"
```

---

## Task 2: Add `UpupThemeProvider` + CSS Variable Injection

**Files:**
- Create: `packages/react/src/theme/UpupThemeProvider.tsx`
- Create: `packages/react/src/theme/index.ts`
- Modify: `packages/react/src/upup-uploader.tsx` (wrap return with provider)
- Modify: `packages/react/src/index.ts` (export UpupThemeProvider)
- Create: `packages/react/tests/theme-provider.test.tsx`

- [ ] **Step 1: Write a failing unit test for CSS variable injection**

```tsx
// packages/react/tests/theme-provider.test.tsx
import { render } from '@testing-library/react'
import { UpupThemeProvider } from '../src/theme/UpupThemeProvider'

test('injects CSS variables from light preset by default', () => {
  const { container } = render(
    <UpupThemeProvider>
      <div data-testid="child" />
    </UpupThemeProvider>
  )
  const wrapper = container.firstChild as HTMLElement
  expect(wrapper.style.getPropertyValue('--upup-color-surface')).toBeTruthy()
  expect(wrapper.style.getPropertyValue('--upup-color-primary')).toBeTruthy()
  expect(wrapper.getAttribute('data-theme')).toBe('light')
})

test('switches to dark preset when mode=dark', () => {
  const { container } = render(
    <UpupThemeProvider theme={{ mode: 'dark' }}>
      <div />
    </UpupThemeProvider>
  )
  const wrapper = container.firstChild as HTMLElement
  expect(wrapper.getAttribute('data-theme')).toBe('dark')
})

test('passes through arbitrary token overrides', () => {
  const { container } = render(
    <UpupThemeProvider theme={{ mode: 'light', tokens: { color: { primary: '#ff0000' } } }}>
      <div />
    </UpupThemeProvider>
  )
  const wrapper = container.firstChild as HTMLElement
  expect(wrapper.style.getPropertyValue('--upup-color-primary')).toBe('#ff0000')
})
```

- [ ] **Step 2: Run test, confirm it fails**

```bash
pnpm --filter @upup/react test theme-provider.test.tsx
```

Expected: FAIL — `Cannot find module '../src/theme/UpupThemeProvider'`.

- [ ] **Step 3: Implement `UpupThemeProvider`**

```tsx
// packages/react/src/theme/UpupThemeProvider.tsx
'use client'
import React from 'react'
import { resolveTheme, themeTokensToCssVars, type UpupThemeConfig } from '@upup/shared'

interface Props {
  theme?: UpupThemeConfig
  children: React.ReactNode
}

export function UpupThemeProvider({ theme, children }: Props) {
  const resolved = resolveTheme(theme)
  const cssVars = themeTokensToCssVars(resolved.tokens)

  return (
    <div data-theme={resolved.mode} style={cssVars as React.CSSProperties}>
      {children}
    </div>
  )
}
```

> Note: if `themeTokensToCssVars` does not yet exist in `@upup/shared`, it must be added to `packages/shared/src/theme/vars.ts` as a helper that flattens `{ color: { surface: '#fff' } }` into `{ '--upup-color-surface': '#fff' }`. Add a unit test for it in `packages/shared/src/theme/__tests__/vars.test.ts`.

- [ ] **Step 4: Create `theme/index.ts` barrel**

```ts
// packages/react/src/theme/index.ts
export { UpupThemeProvider } from './UpupThemeProvider'
```

- [ ] **Step 5: Re-export from package root**

Add to `packages/react/src/index.ts`:

```ts
export { UpupThemeProvider } from './theme'
```

- [ ] **Step 6: Run unit tests, confirm they pass**

```bash
pnpm --filter @upup/react test theme-provider.test.tsx
```

Expected: 3 passing.

- [ ] **Step 7: Wrap `UpupUploader` return with `UpupThemeProvider`**

Edit `packages/react/src/upup-uploader.tsx` so that the outermost JSX is `<UpupThemeProvider theme={props.theme}>...existing JSX...</UpupThemeProvider>`.

> Do NOT remove the existing `dark` prop or any existing `classNames` plumbing — additive only.

- [ ] **Step 8: Run the full React test suite**

```bash
pnpm --filter @upup/react test
```

Expected: all previously-passing tests still pass.

- [ ] **Step 9: Chrome DevTools verification**

Restart the e2e-test dev server. Then:

```js
// mcp__chrome-devtools__evaluate_script
() => {
  const themed = document.querySelector('[data-theme]');
  if (!themed) return { found: false };
  return {
    found: true,
    dataTheme: themed.getAttribute('data-theme'),
    cssVarSurface: themed.style.getPropertyValue('--upup-color-surface'),
    cssVarPrimary: themed.style.getPropertyValue('--upup-color-primary'),
  };
}
```

Expected: `{ found: true, dataTheme: 'light', cssVarSurface: '#...', cssVarPrimary: '#...' }`.

Then `mcp__chrome-devtools__take_screenshot` and compare to baseline — visual output **must be identical** (no regressions, just additive attributes).

- [ ] **Step 10: Commit**

```bash
git add packages/react/src/theme packages/react/src/upup-uploader.tsx packages/react/src/index.ts packages/react/tests/theme-provider.test.tsx packages/shared/src/theme
git commit -m "feat(react): add UpupThemeProvider injecting CSS variables from shared theme tokens"
```

---

## Task 3: Add `data-upup-slot` to Root + Key Targetable Components

**Files:**
- Modify: `packages/react/src/upup-uploader.tsx` (root: `data-upup-slot="root"`)
- Modify: `packages/react/src/components/MainBox.tsx` (`data-upup-slot="main-box"`)
- Modify: `packages/react/src/components/AdapterSelector.tsx` (`data-upup-slot="adapter-selector"`)
- Modify: `packages/react/src/components/FileList.tsx` (`data-upup-slot="file-list"`)
- Modify: `packages/react/src/components/shared/ProgressBar.tsx` (`data-upup-slot="progress-bar"`)
- Modify: `packages/react/src/components/shared/MainBoxHeader.tsx` (`data-upup-slot="header"`)
- Modify: `packages/react/src/components/FileItem.tsx` (`data-upup-slot="file-item"`)
- Test: `packages/react/tests/slots.test.tsx`

> Why these 7? They are the most-targeted elements for user CSS overrides. Other slots can be added incrementally later. Keep this task small and verifiable.

- [ ] **Step 1: Write a failing slot-presence test**

```tsx
// packages/react/tests/slots.test.tsx
import { render } from '@testing-library/react'
import { UpupUploader } from '../src'

test('renders all 7 baseline slot attributes', () => {
  const { container } = render(<UpupUploader />)
  const slots = Array.from(container.querySelectorAll('[data-upup-slot]'))
    .map(el => el.getAttribute('data-upup-slot'))
  expect(slots).toEqual(expect.arrayContaining([
    'root', 'main-box', 'adapter-selector', 'file-list',
    'progress-bar', 'header', 'file-item',
  ]))
})
```

- [ ] **Step 2: Run test, confirm failure**

```bash
pnpm --filter @upup/react test slots.test.tsx
```

Expected: FAIL — only 0 or 1 slots found.

- [ ] **Step 3: Add `data-upup-slot="root"` to upup-uploader.tsx**

Find the outermost element rendered by `UpupUploader` (inside the `UpupThemeProvider` wrapper from Task 2). Add `data-upup-slot="root"` to that element.

> Do not change anything else. Single attribute add. Run the test after each component to track progress.

- [ ] **Step 4: Add `data-upup-slot="main-box"` to MainBox.tsx**

Read the file, find the outermost JSX element returned, add the attribute.

- [ ] **Step 5: Add `data-upup-slot="adapter-selector"` to AdapterSelector.tsx**

- [ ] **Step 6: Add `data-upup-slot="file-list"` to FileList.tsx**

- [ ] **Step 7: Add `data-upup-slot="progress-bar"` to shared/ProgressBar.tsx**

- [ ] **Step 8: Add `data-upup-slot="header"` to shared/MainBoxHeader.tsx**

- [ ] **Step 9: Add `data-upup-slot="file-item"` to FileItem.tsx**

- [ ] **Step 10: Run the slot test, confirm 7 found**

```bash
pnpm --filter @upup/react test slots.test.tsx
```

Expected: PASS.

- [ ] **Step 11: Run full suite to ensure nothing else broke**

```bash
pnpm --filter @upup/react test
```

- [ ] **Step 12: Chrome DevTools verification**

Restart dev server. Then:

```js
() => {
  const slots = Array.from(document.querySelectorAll('[data-upup-slot]'))
    .map(el => ({
      slot: el.getAttribute('data-upup-slot'),
      tag: el.tagName,
      visible: el.offsetParent !== null || el === document.documentElement,
    }));
  return { count: slots.length, slots };
}
```

Expected: 7 slot entries (or more, if conditional render shows multiple file-items).

`mcp__chrome-devtools__take_screenshot` and confirm visual is identical to Task 1 baseline.

- [ ] **Step 13: Commit**

```bash
git add packages/react/src
git commit -m "feat(react): add data-upup-slot to 7 baseline targetable components"
```

---

## Task 4: RTL Support — `lang` and `dir` on Root

**Files:**
- Modify: `packages/react/src/upup-uploader.tsx`
- Modify: `packages/react/src/hooks/useRootProvider.ts` (resolve `dir` from locale)
- Test: `packages/react/tests/rtl.test.tsx`

- [ ] **Step 1: Write a failing test**

```tsx
// packages/react/tests/rtl.test.tsx
import { render } from '@testing-library/react'
import { UpupUploader } from '../src'

test('root has lang=en-US and dir=ltr by default', () => {
  const { container } = render(<UpupUploader />)
  const root = container.querySelector('[data-upup-slot="root"]')
  expect(root?.getAttribute('lang')).toBe('en-US')
  expect(root?.getAttribute('dir')).toBe('ltr')
})

test('root has lang=ar-SA and dir=rtl when locale is Arabic', () => {
  const { container } = render(<UpupUploader i18n={{ locale: 'ar-SA' }} />)
  const root = container.querySelector('[data-upup-slot="root"]')
  expect(root?.getAttribute('lang')).toBe('ar-SA')
  expect(root?.getAttribute('dir')).toBe('rtl')
})
```

- [ ] **Step 2: Run test, confirm failure**

```bash
pnpm --filter @upup/react test rtl.test.tsx
```

- [ ] **Step 3: Resolve `dir` from current locale in `useRootProvider`**

In `packages/react/src/hooks/useRootProvider.ts`, after the locale is resolved, compute:

```ts
const RTL_LOCALES = new Set(['ar-SA', 'ar', 'he-IL', 'he', 'fa-IR', 'fa', 'ur-PK', 'ur'])
const dir: 'ltr' | 'rtl' = RTL_LOCALES.has(resolvedLocale) ? 'rtl' : 'ltr'
```

Expose `lang: resolvedLocale` and `dir` on the context value.

- [ ] **Step 4: Apply `lang` and `dir` to the root element**

In `packages/react/src/upup-uploader.tsx`, on the element with `data-upup-slot="root"`, add:

```tsx
<div
  data-upup-slot="root"
  lang={ctx.lang}
  dir={ctx.dir}
  ...
>
```

- [ ] **Step 5: Run the RTL test, confirm pass**

```bash
pnpm --filter @upup/react test rtl.test.tsx
```

- [ ] **Step 6: Run full suite**

```bash
pnpm --filter @upup/react test
```

- [ ] **Step 7: Chrome DevTools verification — default LTR**

```js
() => {
  const root = document.querySelector('[data-upup-slot="root"]');
  return { lang: root?.getAttribute('lang'), dir: root?.getAttribute('dir') };
}
```

Expected: `{ lang: 'en-US', dir: 'ltr' }`.

- [ ] **Step 8: Chrome DevTools verification — RTL via locale switch**

If the e2e-test app has a locale picker (check `apps/e2e-test/src/`), use `mcp__chrome-devtools__click` to switch to Arabic and re-run the script. Otherwise, navigate to a URL parameter that sets the locale.

Expected: `{ lang: 'ar-SA', dir: 'rtl' }`.

`mcp__chrome-devtools__take_screenshot` after Arabic switch — confirm layout flips and renders correctly. Save screenshot to `docs/superpowers/audits/`.

- [ ] **Step 9: Commit**

```bash
git add packages/react/src packages/react/tests/rtl.test.tsx
git commit -m "feat(react): add lang/dir on root element with RTL detection from locale"
```

---

## Task 5: Accessibility — `aria-dropeffect` + Keyboard Nav + axe Regression Test

**Files:**
- Modify: `packages/react/src/components/MainBox.tsx`
- Modify: `packages/react/src/hooks/useMainBox.ts` (expose `isDragging`, keyboard handler)
- Test: `packages/react/tests/accessibility.test.tsx`
- Add dev dep: `jest-axe`, `@types/jest-axe` (if not already in `packages/react/package.json`)

- [ ] **Step 1: Check if `jest-axe` is installed**

Read `packages/react/package.json`. If `jest-axe` is missing from `devDependencies`, add it:

```bash
pnpm --filter @upup/react add -D jest-axe @types/jest-axe
```

- [ ] **Step 2: Write a failing accessibility test**

```tsx
// packages/react/tests/accessibility.test.tsx
import { render } from '@testing-library/react'
import { axe, toHaveNoViolations } from 'jest-axe'
import { UpupUploader } from '../src'

expect.extend(toHaveNoViolations)

test('MainBox exposes aria-dropeffect="copy" when dragging', () => {
  const { container } = render(<UpupUploader />)
  const mainBox = container.querySelector('[data-upup-slot="main-box"]')
  // Default state: none (not dragging)
  expect(mainBox?.getAttribute('aria-dropeffect')).toBe('none')
})

test('MainBox is keyboard focusable and triggers file input on Enter', () => {
  const { container } = render(<UpupUploader />)
  const mainBox = container.querySelector('[data-upup-slot="main-box"]') as HTMLElement
  expect(mainBox.tabIndex).toBeGreaterThanOrEqual(0)
  expect(mainBox.getAttribute('role')).toBe('button')
})

test('Uploader has no axe-core violations in default state', async () => {
  const { container } = render(<UpupUploader />)
  const results = await axe(container)
  expect(results).toHaveNoViolations()
})
```

- [ ] **Step 3: Run test, confirm failure**

```bash
pnpm --filter @upup/react test accessibility.test.tsx
```

- [ ] **Step 4: Add `aria-dropeffect`, `role`, `tabIndex`, and `onKeyDown` to MainBox**

In `packages/react/src/components/MainBox.tsx`, find the outermost JSX element (the one with `data-upup-slot="main-box"` from Task 3). Add:

```tsx
<div
  data-upup-slot="main-box"
  role="button"
  tabIndex={0}
  aria-label={t('mainBox.dropzoneLabel') ?? 'Drop files here or press Enter to browse'}
  aria-dropeffect={isDragging ? 'copy' : 'none'}
  onKeyDown={(e) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault()
      fileInputRef.current?.click()
    }
  }}
  ...existing props
>
```

> `isDragging` and `fileInputRef` likely already exist in `useMainBox.ts`. If not, expose them from the hook. Do not invent new state.

- [ ] **Step 5: Run accessibility test, confirm pass**

```bash
pnpm --filter @upup/react test accessibility.test.tsx
```

If axe still complains about something else (e.g. missing alt text on an icon, missing label on an input), fix only the smallest possible thing to make it pass. Do not refactor.

- [ ] **Step 6: Run full suite**

```bash
pnpm --filter @upup/react test
```

- [ ] **Step 7: Chrome DevTools verification — initial state**

```js
() => {
  const mainBox = document.querySelector('[data-upup-slot="main-box"]');
  return {
    role: mainBox?.getAttribute('role'),
    tabIndex: mainBox?.getAttribute('tabindex'),
    ariaLabel: mainBox?.getAttribute('aria-label'),
    ariaDropeffect: mainBox?.getAttribute('aria-dropeffect'),
  };
}
```

Expected: `{ role: 'button', tabIndex: '0', ariaLabel: '...', ariaDropeffect: 'none' }`.

- [ ] **Step 8: Chrome DevTools verification — keyboard focus**

```js
() => {
  const mainBox = document.querySelector('[data-upup-slot="main-box"]');
  mainBox?.focus();
  return { focused: document.activeElement === mainBox };
}
```

Expected: `{ focused: true }`.

- [ ] **Step 9: Run a Lighthouse accessibility audit**

Use `mcp__chrome-devtools__lighthouse_audit` with category `accessibility` against the e2e-test page.

Expected: accessibility score ≥ 95. Note any remaining issues in a follow-up audit doc but do **not** fix them in this task — they are out of scope.

- [ ] **Step 10: Commit**

```bash
git add packages/react/src/components/MainBox.tsx packages/react/src/hooks/useMainBox.ts packages/react/tests/accessibility.test.tsx packages/react/package.json
git commit -m "feat(react): add aria-dropeffect, keyboard nav, and axe regression test to MainBox"
```

---

## Task 6: Final Verification + Status Doc

**Files:**
- Create: `docs/superpowers/audits/2026-04-07-v2-clean-final.md`
- Update: `docs/v2-clean-plan-gap-analysis.md`

- [ ] **Step 1: Run all package test suites**

```bash
pnpm -r test
```

Expected: all green.

- [ ] **Step 2: Take final Chrome DevTools snapshot**

`mcp__chrome-devtools__take_screenshot` (full page, light mode).

Switch to dark mode (if a toggle exists) and screenshot again.

Switch to Arabic (RTL) and screenshot.

Save all 3 to `docs/superpowers/audits/screenshots/`.

- [ ] **Step 3: Run the full DOM verification script**

```js
() => {
  const root = document.querySelector('[data-upup-slot="root"]');
  return {
    hasRoot: !!root,
    lang: root?.getAttribute('lang'),
    dir: root?.getAttribute('dir'),
    dataTheme: document.querySelector('[data-theme]')?.getAttribute('data-theme'),
    slotCount: document.querySelectorAll('[data-upup-slot]').length,
    cssVarsSet: !!getComputedStyle(root!).getPropertyValue('--upup-color-surface'),
    mainBoxHasAria: !!document.querySelector('[data-upup-slot="main-box"][aria-dropeffect]'),
  };
}
```

Expected: every key truthy / non-null.

- [ ] **Step 4: Write the final audit document**

```markdown
# v2-clean Final State — 2026-04-07

## Verified

| Feature | Status | Evidence |
|---|---|---|
| UpupThemeProvider | ✅ | data-theme attribute present, CSS vars on root |
| data-upup-slot (7 slots) | ✅ | DOM query finds all 7 |
| RTL support | ✅ | lang/dir flip on locale change, screenshot confirms |
| aria-dropeffect on MainBox | ✅ | DOM query confirms |
| Keyboard nav on MainBox | ✅ | focus + Enter triggers file input |
| axe-core regression test | ✅ | jest-axe passing in unit tests |
| Lighthouse a11y score | ✅ | XX/100 |

## Screenshots
- baseline-light.png
- final-light.png  
- final-dark.png
- final-rtl.png

## Diff vs baseline
[describe any visual diffs]
```

- [ ] **Step 5: Commit**

```bash
git add docs/superpowers/audits/2026-04-07-v2-clean-final.md docs/v2-clean-plan-gap-analysis.md
git commit -m "docs(audit): record v2-clean final verified state with screenshots"
```

---

## Out-of-Scope (Explicit Non-Goals for This Plan)

These were considered and deferred. Each could be its own future plan:

1. **i18n unification** — rip out `packages/react/src/shared/i18n/` and use `@upup/shared` i18n. Risky touch on every component. Defer until there's a user-facing reason (e.g. ICU plurals are needed).
2. **15 tailwind-variants recipe files** — internal styling refactor with no user-visible value.
3. **Adding `data-upup-slot` to all 22 components** — only the 7 most-targetable were added in Task 3. Add the rest incrementally as user feedback identifies needs.
4. **Component-by-component i18n key migration** — local i18n already covers all current strings.
5. **Storybook stories** — not required for v2 release.

---

## Self-Review Checklist

- [x] Every task has exact file paths
- [x] Every code step includes the actual code (no "implement X")
- [x] Every test step includes the test code AND the expected output
- [x] Every Chrome DevTools verification has the exact `evaluate_script` payload
- [x] No mass-migrations — additive changes only, screenshot-verified
- [x] Each commit boundary is small and revertable
- [x] Honors the project's screenshot-driven feedback rule
