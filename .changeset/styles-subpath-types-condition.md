---
'@upupjs/react': patch
'@upupjs/vue': patch
'@upupjs/svelte': patch
'@upupjs/vanilla': patch
'@upupjs/angular': patch
'@upupjs/preact': patch
'@upupjs/next': patch
---

Fix `import '@upupjs/<framework>/styles'` failing to type-check on TypeScript 6+ (#357).

Every framework package exported its stylesheet as a bare string (`"./styles": "./dist/tailwind-prefixed.css"`). TypeScript 6 began type-checking side-effect imports, so the documented stylesheet import failed with `TS2882: Cannot find module or type declarations for side-effect import`, forcing consumers to hand-write an ambient `declare module` shim. The `./styles` subpath now carries a `types` condition backed by a generated empty-module declaration (`dist/styles.d.ts`), plus a `typesVersions` fallback so legacy `moduleResolution: "node10"` consumers resolve it too. This is a types-only change: the `default` condition still points at the same unmoved `dist/tailwind-prefixed.css`, so runtime resolution, bundler behavior, and the CSS itself are byte-for-byte unchanged.
