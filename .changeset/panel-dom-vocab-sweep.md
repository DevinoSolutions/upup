---
'@upup/react': major
'@upup/vue': major
'@upup/svelte': major
'@upup/vanilla': major
'@upup/angular': major
'@upup/preact': major
---

## Uploader-panel DOM vocabulary — `main-box` swept to `uploader-panel`

The N4 sweep (`p21-dom-vocab-unfreeze.md`) missed one frozen string family:
the uploader panel still carried its pre-§16 `main-box` name in the DOM
contract. The 2026-07-07 SWE-principles audit surfaced it; this completes the
sweep. Three strings change spelling (no structural change — same elements,
same attributes, same behavior):

```
main-box              (data-upup-slot value)     -> uploader-panel
upup-main-box         (Angular element selector) -> upup-uploader-panel
upup-main-box-header  (Angular element selector) -> upup-uploader-header
```

This aligns the panel's DOM strings with its component vocabulary
(`UploaderPanel` / `UploaderHeader`, renamed in §16 R4) and with the Angular
convention that element selectors are `upup-<kebab-component-name>`.

**Migration:** replace `[data-upup-slot="main-box"]` → `"uploader-panel"` in
any test selectors or CSS; in Angular templates/tests replace
`upup-main-box` → `upup-uploader-panel` and
`upup-main-box-header` → `upup-uploader-header`.

Not affected: `data-testid="upup-dropzone"` on the same element (unchanged),
the `header` slot value on `UploaderHeader` (unchanged), and everything
`p21-dom-vocab-unfreeze.md` already renamed. No accessibility semantics move.

`@upup/core` and `@upup/server` ship no DOM strings in this surface, and
`@upup/next` re-exports `@upup/react` without embedding DOM strings — all
excluded, same reasoning as p21.

Sweep completeness is now machine-enforced: a repo-wide retired-vocabulary
census (`pnpm run vocab:check`, in CI) fails on any surviving retired token in
any layer — identifiers, DOM strings, templates, fixtures — so a rename can no
longer half-land.

This rides the pending v2→3.0.0 major (see `v2-1-legacy-prop-removal.md`)
rather than adding a second major bump.
