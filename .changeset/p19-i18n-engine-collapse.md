---
'@useupup/core': patch
---

## Remove the deprecated i18n `utils.ts` engine (t/plural/mergeTranslations)

Remove the long-deprecated `i18n/utils.ts` helpers (`t`, `plural`,
`mergeTranslations`) and their public re-exports. They duplicated
`formatUiMessage` / `pluralUiMessage` (the live UI formatter, now CLDR-correct)
and `createTranslator({ overrides })`; all were `@deprecated … removed in v3`
with zero framework consumers. No behavior change.
