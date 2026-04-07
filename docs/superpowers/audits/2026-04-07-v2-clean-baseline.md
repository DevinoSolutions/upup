# v2-clean Baseline Audit — 2026-04-07

**Branch:** v2-clean  
**App:** http://localhost:3333 (apps/e2e-test, Vite + React, port 3333)  
**Tool:** Chrome DevTools via MCP  
**Purpose:** Capture the "before" DOM state prior to implementing Tasks 2–5 (ThemeProvider, data-upup-slot, lang/dir, aria-dropeffect)

---

## Screenshot

**File:** `docs/superpowers/audits/2026-04-07-v2-clean-baseline.png`

**Visual description:**  
Dark-mode uploader UI on a near-black background. Three toggle buttons at the top: "Dark Mode" (active, teal/cyan fill), "Light Mode", and "Headless Hook". Below is a card-style upload panel with a light-gray dashed drop zone border. Inside the drop zone: a row of 7 source icons (My Device, Google Drive, OneDrive, Dropbox, Link, Camera, Audio) and below those a Screen Capture icon. Centered at the bottom of the drop zone: "Drag your files or **browse files**" (browse in teal) and "Max 999 MB files are allowed". Footer shows the upup logo (teal) on the left and "Built by devino" on the right. No visible error states or loading spinners.

---

## DOM Inspection — Script 1: Root Container

```json
{
  "found": true,
  "tag": "DIV",
  "classes": "upup-scope upup-h-full upup-w-full ",
  "lang": null,
  "dir": null,
  "dataState": null,
  "dataUpupSlot": null,
  "dataTheme": null,
  "cssVarSurface": "",
  "cssVarPrimary": ""
}
```

**Key observations:**
- Root element is a `<div>` with classes `upup-scope upup-h-full upup-w-full`
- `lang` attribute: **null** (missing)
- `dir` attribute: **null** (missing)
- `data-state` attribute: **null** (missing)
- `data-upup-slot` attribute: **null** (missing — root is not slotted)
- `data-theme` attribute: **null** (missing — no theme token applied)
- `--upup-color-surface` CSS var: **empty string** (not set)
- `--upup-color-primary` CSS var: **empty string** (not set)

---

## DOM Inspection — Script 2: Coverage Counts

```json
{
  "slotCount": 0,
  "ariaDropeffectCount": 0,
  "dataThemeCount": 0,
  "cssVarsOnRoot": [],
  "langAttr": "en"
}
```

**Key observations:**
- `[data-upup-slot]` elements: **0** (no slot annotations anywhere)
- `[aria-dropeffect]` elements: **0** (drop zone has no ARIA affordance)
- `[data-theme]` elements: **0** (theme tokens not applied via data attribute)
- `--upup-*` CSS vars on root inline style: **[]** (no custom properties injected inline)
- `[lang]` attribute somewhere in page: **"en"** — this is the HTML `<html lang="en">` set by the Vite template, NOT by the upup component tree

---

## Gap Analysis — Before vs After Tasks 2–5

| Attribute / Feature | Current State | Added By | Expected After |
|---|---|---|---|
| `data-theme` on root | absent | Task 2 — UpupThemeProvider | `data-theme="dark"` \| `"light"` |
| `--upup-color-surface` CSS var | empty | Task 2 — UpupThemeProvider | resolved token value |
| `--upup-color-primary` CSS var | empty | Task 2 — UpupThemeProvider | resolved token value |
| `lang` on upup root | null | Task 3 — i18n lang/dir | e.g. `"en"` |
| `dir` on upup root | null | Task 3 — i18n lang/dir | `"ltr"` \| `"rtl"` |
| `[data-upup-slot]` count | 0 | Task 4 — slot annotations | ≥ 1 per named region |
| `[aria-dropeffect]` count | 0 | Task 5 — ARIA drop zone | ≥ 1 on the drop zone |
| `data-state` on root | null | Task 4 or 5 | e.g. `"idle"` \| `"dragging"` |

---

## Notes

- The `lang="en"` detected by Script 2 comes from `<html lang="en">` (Vite template), not from the upup component. Once Task 3 is implemented the upup root `<div>` itself should carry the locale-matched `lang` attribute.
- CSS vars being empty confirms no `UpupThemeProvider` exists yet — dark mode appearance is achieved through Tailwind/static CSS classes, not token injection.
- The dark-mode toggle in the e2e app is functional (buttons visible), but switching themes does not change any `data-theme` attribute — it likely swaps Tailwind class names directly.
- All gaps confirmed match the pre-task expectations described in the task brief.
