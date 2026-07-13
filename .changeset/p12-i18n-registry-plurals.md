---
'@useupup/core': minor
---

## CLDR-correct UI plurals + single locale registry

`pluralUiMessage` previously chose a plural category with an English-binary
rule (`count === 1 ? '_one' : '_other'`), which selects the wrong form for any
locale whose CLDR plural categories differ from English's — most visibly
French, where `one` = {0, 1}: count 0 should render the singular arm ("0
fichier sélectionné") but the old rule always fell through to `_other` ("0
fichiers sélectionnés"). Plural category selection now goes through
`Intl.PluralRules` (native, memoized per locale, zero new dependency), giving
every locale its correct zero/one/two/few/many/other mapping. The fix is
DOM-invisible and backward compatible: `pluralUiMessage` gains an optional
4th `locale` argument that all 21 existing call sites across every framework
inherit automatically via a locale tag carried on the flattened translations
object.

Adding a supported locale previously touched 8 files across 6 independent
hand-maintained lists with no cross-check between them. A new
`packages/core/src/i18n/locales/registry.ts` is now the single source of
truth: `LOCALE_CODES` and a `Record<RegisteredLocaleCode, LocaleBundle>`
`LOCALE_REGISTRY` that the compiler rejects if a code is missing its bundle
or a bundle is missing its code. `LOCALE_META`, the `UpupLocaleCode` union,
both i18n barrels, and the locale test fixtures all derive from it — adding a
locale is now a 2-file change (its bundle + one registry entry). Named
bundle exports (`enUS`..`zhTW`) and public shapes are unchanged.

`resolveLocaleBundle` (introduced by a prior change to accept either a
`LocaleBundle` object or a string code) now resolves registered string codes
from the registry instead of always returning `undefined` for a string —
`locale: 'fr-FR'` now resolves to its bundle instead of silently falling back
to English.
