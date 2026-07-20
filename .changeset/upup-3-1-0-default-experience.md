---
'@upupjs/core': minor
'@upupjs/react': minor
'@upupjs/vue': minor
'@upupjs/svelte': minor
'@upupjs/angular': minor
'@upupjs/vanilla': minor
'@upupjs/preact': minor
'@upupjs/next': minor
'@upupjs/server': minor
---

Redesigned default experience + refined component interface.

**New default UI (all six frameworks, React-canonical):** a single selected
file now renders as a `FileHero`; two or more render as a card list; source
overlays gain a labelled `Back` action; file removal defers ~200ms for a
smooth exit. A new `upup-fx-*` animation layer ships enabled by default.

**Interface additions (`<UpupUploader>` props, identical across frameworks):**

- `animations?: boolean` (default `true`) — decorative motion layer; `false`
  disables it (spinner/progress/focus always stay). Also forced off under
  `prefers-reduced-motion`.
- `quietCompletion?: boolean` (default `false`) — on success, show only a
  brief checkmark and hand off to the completion callbacks/events (no Done
  button or summary), for apps that own the post-upload flow.
- `imageEditor` now defaults on (React/Preact only) with a visible edit
  affordance; pass `imageEditor={false}` to opt out.

**Non-visual:** all packages adopt `exactOptionalPropertyTypes` /
`noUncheckedIndexedAccess`; `@upupjs/server` upload/drive routing is
decomposed by concern behind a single CORS-safe responder. No breaking
changes to the existing prop names or event contract — the additions are
backward-compatible.
