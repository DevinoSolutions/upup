# DX Improvements — v1 → v2 Migration

Track developer experience issues found during incremental migration.

## API Naming

| v1 (current) | v2 (target) | Issue |
|---|---|---|
| `uploadAdapters={['INTERNAL','LINK']}` | `sources={['local','url']}` | Screaming case, jargon ("adapter") |
| `provider="BackBlaze"` | `provider={StorageProvider.BackBlaze}` | Magic string, no autocomplete |
| `driveConfigs.googleDrive.google_client_id` | `cloudDrives.googleDrive.clientId` | Redundant prefix inside nested object |
| `dark={true}` | `theme={{ mode: 'dark' }}` | Binary, not extensible |
| `limit={99}` | `maxFiles={99}` or `restrictions.maxNumberOfFiles` | Naming unclear |
| `maxFileSize={{ size: 999, unit: 'MB' }}` | Same, but also accept `"999MB"` string | Verbose for simple cases |
| `localePack={ja_JP}` | `i18n={{ locale: 'ja-JP' }}` | Object passing vs string code |
| `translations={{ key: 'val' }}` | `i18n={{ overrides: { ns: { key: 'val' }}}}` | Flat vs namespaced |

## Import Experience

| v1 | v2 | Issue |
|---|---|---|
| `import 'upup.../styles'` (manual) | Auto-injected or single import | Easy to forget CSS |
| `import { UpupUploader } from 'upup-react...'` | `import { UpupUploader } from '@upup/react'` | Cleaner scoped package |

## Prop Ergonomics to Add

- `sources` as alias for `uploadAdapters` (lowercase, human-readable)
- `maxFiles` as alias for `limit`
- `theme` prop alongside `dark`/`classNames`
- `i18n` prop alongside `locale`/`translations`
- `onUploadComplete` callback prop (currently ref-only)

## Migration Strategy

Each improvement added ALONGSIDE existing props (backward-compat), verified visually, then old props deprecated in a later pass.
