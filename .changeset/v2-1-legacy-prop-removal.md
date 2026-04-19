---
"upup-react-file-uploader": minor
---

## Removed four legacy v1 props

- `dark` → use `theme.mode: 'light' | 'dark' | 'system'`
- `limit` → use `maxFiles`
- `shouldCompress` → use `imageCompression`
- `classNames` → use `theme.slots` (nested shape)

## Wired `theme.slots` end-to-end

Previously `theme.slots` was publicly typed but the runtime ignored
it. A new `flattenSlotsToClassNames()` in `@upup/shared` bridges the
nested slot shape onto the internal flat map every component reads.
Four new slots added to `UpupThemeSlots` to cover v1 `classNames`
keys that had no v2 equivalent.

## Other breaking bits

- `UpupUploaderPropsClassNames` is no longer a public export of
  `@upup/react` (still internal).
- `theme.slots` is now typed as `DeepPartialSlots` so partial
  overrides compile.
- `CoreOptions.locale` (`@upup/core`) changed from `unknown` to
  `LocaleBundle | UpupLocaleCode`. `CoreOptions.translations` from
  `unknown` to `Partial<UpupMessages>`. Runtime unchanged.

See `docs/migration/v2-to-v2.1.md` for the find-and-replace guide.
