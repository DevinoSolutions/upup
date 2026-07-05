---
'@upup/core': minor
'@upup/react': patch
'@upup/vue': patch
'@upup/svelte': patch
'@upup/angular': patch
'@upup/vanilla': patch
---

## Curated `@upup/core`'s public API surface (F-142)

`@upup/core`'s public `.` entry is now a curated allow-list — every export is
named explicitly (currently 53 values / 74 types), and the wildcard
`export * from './uploader'` is gone. Internal implementation details
(`FileManager`, `UploadManager`, `PipelineEngine`, the orchestrator,
controllers, context shapes, the multipart-session store, low-level utils —
119 names in total) moved to a new `@upup/core/internal` deep-import subpath,
alongside the existing `./contracts`/`./i18n`/`./theme`/`./strategies`
pattern.

**Removal from the public entry is breaking** — this is expressed as a
**minor** entry here because the v2 line is already staged for a major bump
(see `v2-1-legacy-prop-removal.md`); this rides that pending major rather
than adding a second one.

**Migration:** if you imported an implementation detail from `@upup/core`
directly, import it from `@upup/core/internal` instead:

```diff
-import { FileManager } from '@upup/core'
+import { FileManager } from '@upup/core/internal'
```

The 53 public values / 74 public types you already imported by name are
unaffected — nothing in the curated public surface moved or renamed.

`@upup/core`'s `package.json` also gains a `typesVersions` fallback entry for
every existing subpath export (`./contracts`, `./internal`, `./i18n`,
`./theme`, `./strategies`, `./strategies/tus-upload`, `./pipeline`, the
`./steps/*` entries) — purely additive packaging metadata for resolvers that
don't fully support conditional `exports` subpaths; tooling that already
resolved these subpaths via `exports` is unaffected. If you inspect this
package's `package.json` directly (rather than importing it), you'll notice
the new field.

`@upup/react`, `@upup/vue`, `@upup/svelte`, `@upup/angular`, and
`@upup/vanilla` get a **patch** entry: their own consumption of the
now-internal names was migrated to `@upup/core/internal` in this same
change, so they were never broken, but their internal import paths changed.
Their own public APIs are unaffected. `@upup/preact` and `@upup/next`
re-export `@upup/react` wholesale and don't reference `@upup/core` internals
directly, so neither needs an entry here. `@upup/server` doesn't import
`@upup/core` in this surface either.
