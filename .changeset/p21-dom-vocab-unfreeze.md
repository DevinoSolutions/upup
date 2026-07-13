---
'@useupup/react': major
'@useupup/vue': major
'@useupup/svelte': major
'@useupup/vanilla': major
'@useupup/angular': major
'@useupup/preact': major
---

## N4 DOM-vocabulary unfreeze — `upup-adapter-*` DOM-contract strings renamed to `upup-source-*`

The last surviving frozen legacy vocabulary in the DOM contract is swept. Five
strings, shared identically across all six framework packages and asserted by
the cross-framework parity harness, change spelling (no structural change —
same elements, same attributes, same behavior):

```
upup-adapter-view-container -> upup-source-view-container
upup-adapter-selector       -> upup-source-selector
upup-adapter-view           -> upup-source-view
adapter-selector  (data-upup-slot value) -> source-selector
adapter-view      (data-upup-slot value) -> source-view
```

This unifies the source-selector container's testid/slot with its
already-correct `upup-source-*` child tiles into one namespace.

**Migration:** replace `upup-adapter-selector`→`upup-source-selector`,
`upup-adapter-view`→`upup-source-view`,
`upup-adapter-view-container`→`upup-source-view-container` in any test
selectors or CSS; replace `[data-upup-slot="adapter-selector"]`→`"source-selector"`
and `"adapter-view"`→`"source-view"`.

Not affected: `data-testid="upup-root"`, `upup-file-*`, `upup-source-${id}` /
`upup-source-local` (already-correct, unchanged), `upup-upload-error`. No
accessibility semantics move (these strings carry no `role`/`aria-*`).

`@useupup/core` and `@useupup/server` ship no DOM strings in this surface — excluded.
`@useupup/next` re-exports `@useupup/react` as a thin `export * from '@useupup/react'`
with no bundling/inlining of its own (verified: its `dist/index.js` is 107
bytes, and its shipped `tailwind-prefixed.css` has zero `adapter` references)
— excluded, since consumers get the renamed strings transitively through
their own `@useupup/react` dependency, not through anything `@useupup/next` embeds.

This rides the pending v2→3.0.0 major (see `v2-1-legacy-prop-removal.md`)
rather than adding a second major bump.

F-654 (the `oneDrive`/`one-drive`/`onedrive` provider-slug spelling split)
was reviewed for this sweep and explicitly deferred — it is a three-subsystem
public-API/enum change (not a DOM string), and folding it in here would
silently rewrite a public enum inside a "DOM-vocabulary" commit. Left
unchanged; recommended as a future, separately-scoped item. (That item has
since landed: the bare `onedrive` third form is retired repo-wide, gated by
`vocab:check` — see the B7 provider-slug sweep, 2026-07-08.)
