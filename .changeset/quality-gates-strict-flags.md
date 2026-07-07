---
'@upup/core': major
'@upup/react': major
'@upup/server': major
'@upup/vue': major
'@upup/svelte': major
'@upup/vanilla': major
'@upup/angular': major
'@upup/preact': major
'@upup/next': major
---

Enable strict TypeScript flags (`noUncheckedIndexedAccess`, `exactOptionalPropertyTypes`) and ESLint v2 burn-down across all packages. Runtime-observable changes: nullable index-access sites now guard properly (narrowing instead of unchecked access), optional props distinguish `undefined` from missing. All lint errors resolved without suppression-by-disabling — every surviving `eslint-disable` carries a documented reason.
