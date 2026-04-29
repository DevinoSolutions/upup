# ADR: `packages/upup` vs the v2 workspace packages

**Date:** 2026-04-19
**Status:** Proposed
**Author:** Session notes — awaiting approval

---

## Context

The monorepo publishes one package to npm today:
**`upup-react-file-uploader`**. It lives at `packages/upup` and is a
self-contained v1 codebase (`packages/upup/src/frontend` +
`packages/upup/src/backend`). The currently-published version is
`2.0.0` (shipped 2026-03-16), which per its own CHANGELOG was a marketing
bump from 1.5.2 with no API changes.

The entire v2 refactor — 86 features, theme system, ICU i18n,
`@upup/core` pipeline, theme.slots wiring, presets, event log — lives
in **four new workspace-only packages**:

| Package | Role | Published? |
|---|---|---|
| `@upup/react` | v2 React component + hooks | workspace only |
| `@upup/core` | headless v2 upload engine | workspace only |
| `@upup/shared` | v2 shared types, i18n, theme tokens | workspace only |
| `@upup/server` | v2 server strategies | workspace only |

`packages/upup` does **not depend on** any of them. The v2 work is
effectively orphaned from an npm-consumer perspective — installing
`upup-react-file-uploader@2.0.0` today gets the v1 implementation,
not the v2 one.

## Problem

A decision is needed before v2.1.0 can be released. We have three
coherent paths and shouldn't ship without picking one.

## Options

### Option A — Retire `packages/upup`

- Rename `@upup/react`'s `package.json.name` to
  `upup-react-file-uploader`.
- Delete `packages/upup`.
- Next publish (v2.1.0) is the new codebase.

| Pro | Con |
|---|---|
| Single source of truth | All workspace imports `from '@upup/react'` have to change |
| All v2 work reaches consumers | apps/landing, apps/playground, apps/e2e-test need refactors |
| Zero confusion about which package to use | `packages/upup/server` and `packages/upup/backend` have v1-specific logic that would either need porting or deletion |

### Option B — Make `packages/upup` a thin re-export shell ⭐

- Rewrite `packages/upup/src/index.ts` to simply
  `export * from '@upup/react'`.
- Similarly for `/server` → `@upup/server`, `/locales` →
  `@upup/shared`, etc.
- Add `@upup/react` (and siblings) to `packages/upup/dependencies`.
- Its tsup build becomes a bundling step that pulls in the workspace
  code.
- Delete `packages/upup/src/frontend/` and `packages/upup/src/backend/`
  (the legacy implementation).

| Pro | Con |
|---|---|
| npm name `upup-react-file-uploader` stays stable | Sub-path exports (`/server`, `/shared`, `/locales`, `/styles`) need careful wiring |
| Existing consumers upgrade with a version bump + migration guide | Risk of runtime regression if the bundle layout shifts |
| Workspace packages stay independently testable | |
| The v2 refactor actually benefits real users | |

### Option C — Ship v2 under a new npm name

- Publish the new `@upup/react` + siblings as a different npm package
  (e.g. `upup` or `@upup/react`).
- Leave `packages/upup@2.0.0` as legacy, frozen.
- v2.1 ships to the new name instead.

| Pro | Con |
|---|---|
| Zero disruption to existing consumers | Consumers have to know to migrate to a new package name |
| Can deprecate `upup-react-file-uploader` cleanly | Confusing ecosystem: two parallel packages |
| Decouples release cadence | The v2 work has already been marketed as "upup v2" — a rename is a harder communication story |

## Recommendation: **Option B**

The npm name is already associated with the uploader brand. The v2
refactor is the actual product. Making `packages/upup` a thin shim
keeps the consumer-facing story simple ("upgrade to v2.1 for the new
v2 architecture") while letting the workspace packages stay where the
engineering investment has gone.

This also matches the `.changeset/v2-1-legacy-prop-removal.md` I wrote
earlier, which declares a minor bump on both
`upup-react-file-uploader` AND the workspace packages. Option B is
the only option where that changeset composes cleanly — under A the
workspace packages disappear, and under C `upup-react-file-uploader`
doesn't get the bump.

## Implementation sketch for Option B

Rough plan, not a commit:

1. **Add workspace deps** to `packages/upup/package.json`:
   ```json
   "dependencies": {
     "@upup/react": "workspace:*",
     "@upup/shared": "workspace:*",
     "@upup/core": "workspace:*",
     "@upup/server": "workspace:*",
     ...existing third-party runtime deps only if needed at runtime
   }
   ```

2. **Rewrite index barrels** to re-export:
   ```ts
   // packages/upup/src/index.ts
   export * from '@upup/react'
   export type * from '@upup/react'
   // packages/upup/src/server.ts
   export * from '@upup/server'
   // packages/upup/src/locales.ts
   export * from '@upup/shared/locales'
   ```

3. **Delete the legacy code** (`src/frontend/`, `src/backend/`, the
   Jest/Playwright setup specific to this package). Keep:
   `README.md`, `LICENSE`, `CHANGELOG.md`, assets (`logo-*.png`,
   `devino-*.png`), tsup.config.ts (rewritten for bundling).

4. **Update tsup config** so the dist is a single bundled file that
   includes the workspace code inline (consumers of npm don't have
   access to workspace packages).

5. **Re-run `changeset version`** so `packages/upup` gets its version
   bump applied.

6. **Smoke test:** run the `apps/e2e-test` suite against a locally
   built `upup-react-file-uploader@next`, not the workspace symlink.

Estimated scope: **~4 hours** if the sub-path exports go smoothly,
potentially more if the tsup bundle config needs iteration.

## Not recommended

- Attempting this in the same PR as the v2.1 release work. It's a
  separate, traceable refactor.
- Partial migration (re-export *some* surfaces, keep others legacy) —
  leaves the confusion in place.

## Open questions

1. Does Option B require a **major** bump instead of minor? Debatable.
   The runtime completely changes; even if the public API is the same,
   consumers are getting a fundamentally different implementation.
   Argue on a case-by-case: if the migration guide suffices, minor;
   if existing apps break without code changes, major.
2. The `packages/upup/server/` legacy helpers have different call
   signatures from `@upup/server`. If we're keeping the signatures
   for backwards-compat, the re-export isn't straight — we'd need a
   translation layer.

Both worth clearing before pressing go.
