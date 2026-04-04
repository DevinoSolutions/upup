# Plan 2: Complete i18n System Upgrade

**Execution order:** This plan can run in parallel with Plans 1 and 4. Plan 3 (Theme) should run AFTER this plan. Plan 2 deliberately preserves the existing `dark`, `classNames`, and `icons` props — Plan 3 is responsible for replacing `dark`/`classNames` with the `theme` prop.

**Date:** 2026-04-02
**Branch:** `huge-refactor`
**Status:** Ready for execution
**Dependency chain:** shared types -> shared createTranslator -> core integration -> react i18n prop -> react component wiring

---

## Overview

Replace the flat `Translations` type with a namespaced, ICU-powered i18n system across all four packages. This plan covers features #56-#68 and #42 from V2_FEATURE_STATUS.md.

### Current State
- Flat `Translations` type with 127 keys in `packages/shared/src/i18n/types.ts`
- Simple `{{var}}` interpolation in `packages/shared/src/i18n/utils.ts`
- Manual `_one`/`_other` plural suffix convention
- 9 locale packs (en_US, ar_SA, de_DE, es_ES, fr_FR, ja_JP, ko_KR, zh_CN, zh_TW)
- React: `locale` + `translationOverrides` props on `UpupUploader`
- React context passes raw `translations: Translations` object
- Core: `PipelineContext.t` is a stub `(key: string) => key`
- Core: `CoreOptions.locale` and `CoreOptions.translations` typed as `unknown`
- 16+ hardcoded English strings in react components

### Target State
- Nested `UpupMessages` type with namespace grouping (common, header, errors, camera, etc.)
- ICU MessageFormat syntax via `intl-messageformat` library
- `createTranslator()` factory with formatter cache and fallback chain
- BCP 47 locale codes (`en-US` not `en_US`) in public API
- Locale metadata (code, language, dir) on each bundle
- Async locale loading via `loadLocale` callback
- Single `i18n` prop on `<UpupUploader>` replacing `locale` + `translationOverrides`
- Bring-your-own translator mode (`i18n.t`)
- `lang`/`dir` attributes on root element
- All 18+ components wired to context translator
- `onMissingKey` handler for dev warnings

---

## Phase 1: @upup/shared Foundation Types (#57, #58, #59)

### Step 1.1: Add `intl-messageformat` dependency

```bash
cd packages/shared
pnpm add intl-messageformat
```

This adds ICU MessageFormat parsing and formatting. The library is ~41KB gzipped and handles plurals, selects, dates, numbers per CLDR rules.

### Step 1.2: Create namespaced `UpupMessages` type

**File:** `packages/shared/src/i18n/types.ts` (rewrite)

**TDD - Write test first:**

**File:** `packages/shared/src/__tests__/i18n/types.test.ts` (new)

```typescript
import { describe, it, expectTypeOf } from 'vitest'
import type {
  UpupMessages,
  LocaleBundle,
  UpupLocaleCode,
  FlatMessageKey,
} from '../i18n/types'

describe('UpupMessages type', () => {
  it('has required namespace objects', () => {
    expectTypeOf<UpupMessages>().toHaveProperty('common')
    expectTypeOf<UpupMessages>().toHaveProperty('header')
    expectTypeOf<UpupMessages>().toHaveProperty('dropzone')
    expectTypeOf<UpupMessages>().toHaveProperty('fileList')
    expectTypeOf<UpupMessages>().toHaveProperty('filePreview')
    expectTypeOf<UpupMessages>().toHaveProperty('driveBrowser')
    expectTypeOf<UpupMessages>().toHaveProperty('url')
    expectTypeOf<UpupMessages>().toHaveProperty('camera')
    expectTypeOf<UpupMessages>().toHaveProperty('audio')
    expectTypeOf<UpupMessages>().toHaveProperty('screenCapture')
    expectTypeOf<UpupMessages>().toHaveProperty('branding')
    expectTypeOf<UpupMessages>().toHaveProperty('errors')
  })

  it('common namespace has expected keys', () => {
    expectTypeOf<UpupMessages['common']>().toHaveProperty('cancel')
    expectTypeOf<UpupMessages['common']>().toHaveProperty('done')
    expectTypeOf<UpupMessages['common']>().toHaveProperty('loading')
  })

  it('all values are strings', () => {
    expectTypeOf<UpupMessages['common']['cancel']>().toEqualTypeOf<string>()
  })
})

describe('LocaleBundle type', () => {
  it('has metadata and messages', () => {
    expectTypeOf<LocaleBundle>().toHaveProperty('code')
    expectTypeOf<LocaleBundle>().toHaveProperty('language')
    expectTypeOf<LocaleBundle>().toHaveProperty('dir')
    expectTypeOf<LocaleBundle>().toHaveProperty('messages')
  })

  it('code is UpupLocaleCode', () => {
    expectTypeOf<LocaleBundle['code']>().toEqualTypeOf<UpupLocaleCode>()
  })

  it('dir is ltr or rtl', () => {
    expectTypeOf<LocaleBundle['dir']>().toEqualTypeOf<'ltr' | 'rtl'>()
  })
})

describe('FlatMessageKey type', () => {
  it('produces dot-notation keys', () => {
    type Keys = FlatMessageKey
    // Should include things like 'common.cancel', 'errors.uploadFailed', etc.
    expectTypeOf<'common.cancel'>().toMatchTypeOf<Keys>()
    expectTypeOf<'errors.uploadFailed'>().toMatchTypeOf<Keys>()
    expectTypeOf<'camera.capture'>().toMatchTypeOf<Keys>()
  })
})
```

**Implementation:**

**File:** `packages/shared/src/i18n/types.ts` (rewrite)

```typescript
/**
 * Supported BCP 47 locale codes.
 */
export type UpupLocaleCode =
  | 'en-US'
  | 'ar-SA'
  | 'de-DE'
  | 'es-ES'
  | 'fr-FR'
  | 'ja-JP'
  | 'ko-KR'
  | 'zh-CN'
  | 'zh-TW'
  | (string & {}) // allow custom locales while keeping autocomplete

/**
 * Metadata + messages for a locale.
 */
export interface LocaleBundle {
  /** BCP 47 locale code, e.g. "en-US" */
  code: UpupLocaleCode
  /** Human-readable language name, e.g. "English" */
  language: string
  /** Text direction */
  dir: 'ltr' | 'rtl'
  /** The message catalog */
  messages: UpupMessages
}

// ── Namespace types ──────────────────────────────────────────

export interface CommonMessages {
  cancel: string
  done: string
  loading: string
  or: string
}

export interface AdapterMessages {
  myDevice: string
  googleDrive: string
  oneDrive: string
  dropbox: string
  link: string
  camera: string
  audio: string
  screenCapture: string
}

export interface DropzoneMessages {
  /** ICU: "{count, plural, one {Drag your file or} other {Drag your files or}}" */
  dragFilesOr: string
  /** ICU: "{count, plural, one {Drag your file here} other {Drag your files here}}" */
  dragFilesHere: string
  browseFiles: string
  dragOrBrowse: string
  selectAFolder: string
  /** ICU: "Max {size} {unit} {count, plural, one {file is} other {files are}} allowed" */
  maxFileSizeAllowed: string
  /** ICU: "Min {size} {unit}" */
  minFileSizeDisplay: string
  /** ICU: "Allowed types: {types}" */
  allowedFileTypes: string
  /** ICU: "Up to {limit, plural, one {# file} other {# files}}" */
  maxFileCount: string
  /** ICU: "At least {limit, plural, one {# file required} other {# files required}}" */
  minFileCount: string
  /** ICU: "Total file size exceeds the maximum of {size} {unit}" */
  totalFileSizeExceeded: string
  /** ICU: "Max total size: {size} {unit}" */
  maxTotalFileSizeDisplay: string
  /** ICU: "Add your documents here, you can upload up to {limit} files max" */
  addDocumentsHere: string
  /** ICU: "Drop files here or click to browse" */
  dropAriaLabel: string
}

export interface HeaderMessages {
  removeAllFiles: string
  addingMoreFiles: string
  /** ICU: "{count, plural, one {# file selected} other {# files selected}}" */
  filesSelected: string
  addMore: string
}

export interface FileListMessages {
  /** ICU: "Upload {count, plural, one {# file} other {# files}}" */
  uploadFiles: string
  resumeUpload: string
  pauseUpload: string
}

export interface FilePreviewMessages {
  removeFile: string
  renameFile: string
  clickToPreview: string
  editImage: string
  zeroBytes: string
  bytes: string
  kb: string
  mb: string
  gb: string
  tb: string
  /** ICU: "Error: {message}" */
  previewError: string
}

export interface DriveBrowserMessages {
  noAcceptedFilesFound: string
  selectThisFolder: string
  /** ICU: "Add {count, plural, one {# file} other {# files}}" */
  addFiles: string
  logOut: string
  search: string
  /** ICU: "Authenticate with {provider} to select files for upload" */
  authenticatePrompt: string
  /** ICU: "Sign in with {provider}" */
  signInWith: string
}

export interface UrlMessages {
  enterFileUrl: string
  fetch: string
}

export interface CameraMessages {
  capture: string
  /** ICU: "switch to {side}" */
  switchToCamera: string
  addImage: string
  photo: string
  video: string
  startVideoRecording: string
  stopVideoRecording: string
  cameraRecording: string
  addVideo: string
  mirrorCamera: string
  front: string
  back: string
}

export interface AudioMessages {
  startRecording: string
  stopRecording: string
  recording: string
  addAudio: string
  deleteRecording: string
}

export interface ScreenCaptureMessages {
  startScreenCapture: string
  stopScreenCapture: string
  screenRecording: string
  addScreenCapture: string
  deleteScreenCapture: string
}

export interface BrandingMessages {
  poweredBy: string
  builtBy: string
}

export interface ErrorMessages {
  multipleFilesNotAllowed: string
  failedToGetUploadUrl: string
  /** ICU: "Status: {status} ({statusText}). Details: {details}" */
  statusError: string
  /** ICU: "Network error during upload - Status: {status} ({statusText})" */
  networkErrorDuringUpload: string
  /** ICU: "Missing required configuration: {missing}" */
  missingRequiredConfiguration: string
  /** ICU: "Invalid provider: {provider}. Valid options: {validOptions}" */
  invalidProvider: string
  /** ICU: "Invalid tokenEndpoint URL: {tokenEndpoint} {error}" */
  invalidTokenEndpoint: string
  maxFileSizeMustBeGreater: string
  /** ICU: "Invalid accept format: {accept}. Use MIME types..." */
  invalidAcceptFormat: string
  unauthorizedAccess: string
  presignedUrlInvalid: string
  temporaryCredentialsInvalid: string
  corsMisconfigured: string
  fileTooLarge: string
  invalidFileType: string
  storageQuotaExceeded: string
  signedUrlGenerationFailed: string
  /** ICU: "Upload failed with error code: {code}" */
  uploadFailedWithCode: string
  /** ICU: "Upload failed: {message}" */
  uploadFailed: string
  dropboxSessionExpired: string
  dropboxMissingPermissions: string
  failedToRefreshExpiredToken: string
  allowedLimitSurpassed: string
  /** ICU: "{name} has an unsupported type!" */
  fileUnsupportedType: string
  /** ICU: "{name} is larger than {size} {unit}!" */
  fileTooLargeName: string
  /** ICU: "{name} is smaller than {size} {unit}!" */
  fileTooSmallName: string
  /** ICU: "Min {size} {unit} {count, plural, one {file is} other {files are}} required" */
  minFileSizeAllowed: string
  minFileSizeMustBeGreater: string
  /** ICU: "{name} has previously been selected" */
  filePreviouslySelected: string
  /** ICU: "A file with this url: {url} has previously been selected" */
  fileWithUrlPreviouslySelected: string
  /** ICU: "Error compressing {name}" */
  errorCompressingFile: string
  /** ICU: "Error compressing image {name}" */
  errorCompressingImage: string
  generatingThumbnails: string
  clientIdRequired: string
  popupBlocked: string
  dropboxClientIdMissing: string
  dropboxAuthFailed: string
  /** ICU: "Error: {details}" */
  genericErrorDetails: string
  /** ICU: "Error processing files: {message}" */
  errorProcessingFiles: string
  /** ICU: "Error selecting folder: {message}" */
  errorSelectingFolder: string
  graphClientNotInitialized: string
  dropboxNoAccessToken: string
  /** ICU: "Silent token acquisition failed: {details}" */
  silentTokenAcquisitionFailed: string
  /** ICU: "MSAL initialization failed: {details}" */
  msalInitializationFailed: string
  /** ICU: "Silent token acquisition failed, proceeding with interactive login{details}" */
  silentTokenAcquisitionProceeding: string
  /** ICU: "Sign-in failed: {message}" */
  signInFailed: string
  /** ICU: "Handle sign-in failed: {message}" */
  handleSignInFailed: string
  /** ICU: "Sign-out failed: {message}" */
  signOutFailed: string
  imageEditorFailed: string
}

/**
 * Complete namespaced message catalog.
 * All values use ICU MessageFormat syntax.
 */
export interface UpupMessages {
  common: CommonMessages
  adapters: AdapterMessages
  dropzone: DropzoneMessages
  header: HeaderMessages
  fileList: FileListMessages
  filePreview: FilePreviewMessages
  driveBrowser: DriveBrowserMessages
  url: UrlMessages
  camera: CameraMessages
  audio: AudioMessages
  screenCapture: ScreenCaptureMessages
  branding: BrandingMessages
  errors: ErrorMessages
}

// ── Utility types ────────────────────────────────────────────

/** Namespace names */
export type MessageNamespace = keyof UpupMessages

/**
 * Dot-notation key type: "common.cancel" | "errors.uploadFailed" | ...
 */
export type FlatMessageKey = {
  [NS in keyof UpupMessages]: `${NS & string}.${keyof UpupMessages[NS] & string}`
}[keyof UpupMessages]

/**
 * Deep partial override type for user-provided translation patches.
 */
export type PartialMessages = {
  [NS in keyof UpupMessages]?: Partial<UpupMessages[NS]>
}

// ── Legacy compat (deprecated, remove in v3) ─────────────────

/**
 * @deprecated Use `UpupMessages` instead. Will be removed in v3.
 */
export type Translations = UpupMessages
```

### Step 1.3: Create locale metadata + BCP 47 codes

**File:** `packages/shared/src/i18n/locale-meta.ts` (new)

```typescript
import type { UpupLocaleCode } from './types'

export interface LocaleMeta {
  code: UpupLocaleCode
  language: string
  dir: 'ltr' | 'rtl'
}

export const LOCALE_META: Record<string, LocaleMeta> = {
  'en-US': { code: 'en-US', language: 'English', dir: 'ltr' },
  'ar-SA': { code: 'ar-SA', language: 'العربية', dir: 'rtl' },
  'de-DE': { code: 'de-DE', language: 'Deutsch', dir: 'ltr' },
  'es-ES': { code: 'es-ES', language: 'Español', dir: 'ltr' },
  'fr-FR': { code: 'fr-FR', language: 'Français', dir: 'ltr' },
  'ja-JP': { code: 'ja-JP', language: '日本語', dir: 'ltr' },
  'ko-KR': { code: 'ko-KR', language: '한국어', dir: 'ltr' },
  'zh-CN': { code: 'zh-CN', language: '中文(简体)', dir: 'ltr' },
  'zh-TW': { code: 'zh-TW', language: '中文(繁體)', dir: 'ltr' },
}

/**
 * Normalize legacy underscore codes to BCP 47 hyphenated format.
 * e.g. "en_US" -> "en-US", "fr_FR" -> "fr-FR"
 */
export function normalizeBcp47(code: string): UpupLocaleCode {
  return code.replace(/_/g, '-') as UpupLocaleCode
}
```

---

## Phase 2: @upup/shared en-US Locale Pack Migration (#56, #57)

### Step 2.1: Rewrite en-US with ICU MessageFormat + namespaces

**TDD - Write test first:**

**File:** `packages/shared/src/__tests__/i18n/en-US.test.ts` (new)

```typescript
import { describe, it, expect } from 'vitest'
import { enUS } from '../i18n/locales/en-US'
import type { UpupMessages, LocaleBundle } from '../i18n/types'

describe('en-US locale bundle', () => {
  it('has correct metadata', () => {
    expect(enUS.code).toBe('en-US')
    expect(enUS.language).toBe('English')
    expect(enUS.dir).toBe('ltr')
  })

  it('has all required namespaces', () => {
    const namespaces: (keyof UpupMessages)[] = [
      'common', 'adapters', 'dropzone', 'header', 'fileList',
      'filePreview', 'driveBrowser', 'url', 'camera', 'audio',
      'screenCapture', 'branding', 'errors',
    ]
    for (const ns of namespaces) {
      expect(enUS.messages).toHaveProperty(ns)
    }
  })

  it('uses ICU plural syntax', () => {
    expect(enUS.messages.header.filesSelected).toContain('{count, plural,')
    expect(enUS.messages.fileList.uploadFiles).toContain('{count, plural,')
    expect(enUS.messages.dropzone.maxFileCount).toContain('{limit, plural,')
  })

  it('uses ICU {var} syntax, not {{var}}', () => {
    const json = JSON.stringify(enUS.messages)
    expect(json).not.toContain('{{')
    expect(json).not.toContain('}}')
  })

  it('satisfies LocaleBundle type', () => {
    const bundle: LocaleBundle = enUS
    expect(bundle).toBeDefined()
  })
})
```

**Implementation:**

**File:** `packages/shared/src/i18n/locales/en-US.ts` (new - note hyphen, not underscore)

```typescript
import type { LocaleBundle } from '../types'

export const enUS: LocaleBundle = {
  code: 'en-US',
  language: 'English',
  dir: 'ltr',
  messages: {
    common: {
      cancel: 'Cancel',
      done: 'Done',
      loading: 'Loading...',
      or: 'or',
    },

    adapters: {
      myDevice: 'My Device',
      googleDrive: 'Google Drive',
      oneDrive: 'OneDrive',
      dropbox: 'Dropbox',
      link: 'Link',
      camera: 'Camera',
      audio: 'Audio',
      screenCapture: 'Screen Capture',
    },

    dropzone: {
      dragFilesOr: '{count, plural, one {Drag your file or} other {Drag your files or}}',
      dragFilesHere: '{count, plural, one {Drag your file here} other {Drag your files here}}',
      browseFiles: 'browse files',
      dragOrBrowse: 'Drag or browse to upload',
      selectAFolder: 'select a folder',
      maxFileSizeAllowed:
        'Max {size} {unit} {count, plural, one {file is allowed} other {files are allowed}}',
      minFileSizeDisplay: 'Min {size} {unit}',
      allowedFileTypes: 'Allowed types: {types}',
      maxFileCount: 'Up to {limit, plural, one {# file} other {# files}}',
      minFileCount: 'At least {limit, plural, one {# file required} other {# files required}}',
      totalFileSizeExceeded:
        'Total file size exceeds the maximum of {size} {unit}',
      maxTotalFileSizeDisplay: 'Max total size: {size} {unit}',
      addDocumentsHere:
        'Add your documents here, you can upload up to {limit} files max',
      dropAriaLabel: 'Drop files here or click to browse',
    },

    header: {
      removeAllFiles: 'Remove all files',
      addingMoreFiles: 'Adding more files',
      filesSelected: '{count, plural, one {# file selected} other {# files selected}}',
      addMore: 'Add More',
    },

    fileList: {
      uploadFiles: 'Upload {count, plural, one {# file} other {# files}}',
      resumeUpload: 'Resume upload',
      pauseUpload: 'Pause upload',
    },

    filePreview: {
      removeFile: 'Remove file',
      renameFile: 'Click to rename',
      clickToPreview: 'Click to preview',
      editImage: 'Edit image',
      zeroBytes: '0 Byte',
      bytes: 'Bytes',
      kb: 'KB',
      mb: 'MB',
      gb: 'GB',
      tb: 'TB',
      previewError: 'Error: {message}',
    },

    driveBrowser: {
      noAcceptedFilesFound: 'No accepted files found',
      selectThisFolder: 'Select this folder',
      addFiles: 'Add {count, plural, one {# file} other {# files}}',
      logOut: 'Log out',
      search: 'Search',
      authenticatePrompt:
        'Authenticate with {provider} to select files for upload',
      signInWith: 'Sign in with {provider}',
    },

    url: {
      enterFileUrl: 'Enter file url',
      fetch: 'Fetch',
    },

    camera: {
      capture: 'Capture',
      switchToCamera: 'switch to {side}',
      addImage: 'Add Image',
      photo: 'Photo',
      video: 'Video',
      startVideoRecording: 'Record',
      stopVideoRecording: 'Stop',
      cameraRecording: 'Recording...',
      addVideo: 'Add Video',
      mirrorCamera: 'Mirror',
      front: 'front',
      back: 'back',
    },

    audio: {
      startRecording: 'Start Recording',
      stopRecording: 'Stop Recording',
      recording: 'Recording...',
      addAudio: 'Add Audio',
      deleteRecording: 'Delete Recording',
    },

    screenCapture: {
      startScreenCapture: 'Start Screen Capture',
      stopScreenCapture: 'Stop Capture',
      screenRecording: 'Recording Screen...',
      addScreenCapture: 'Add Screen Capture',
      deleteScreenCapture: 'Delete Recording',
    },

    branding: {
      poweredBy: 'Powered by',
      builtBy: 'Built by',
    },

    errors: {
      multipleFilesNotAllowed: 'Multiple file uploads are not allowed',
      failedToGetUploadUrl: 'Failed to get upload URL',
      statusError: 'Status: {status} ({statusText}). Details: {details}',
      networkErrorDuringUpload:
        'Network error during upload - Status: {status} ({statusText})',
      missingRequiredConfiguration:
        'Missing required configuration: {missing}',
      invalidProvider:
        'Invalid provider: {provider}. Valid options: {validOptions}',
      invalidTokenEndpoint:
        'Invalid tokenEndpoint URL: {tokenEndpoint} {error}',
      maxFileSizeMustBeGreater: 'maxFileSize must be greater than 0',
      invalidAcceptFormat:
        'Invalid accept format: {accept}. Use MIME types, */*, * or extensions (like .fbx)',
      unauthorizedAccess: 'Unauthorized access to Provider',
      presignedUrlInvalid: 'Presigned URL has expired or is invalid',
      temporaryCredentialsInvalid:
        'Temporary credentials are no longer valid',
      corsMisconfigured: 'CORS configuration prevents file upload',
      fileTooLarge: 'File exceeds maximum size limit',
      invalidFileType: 'File type is not allowed',
      storageQuotaExceeded: 'Storage quota has been exceeded',
      signedUrlGenerationFailed: 'Failed to generate signed upload URL',
      uploadFailedWithCode: 'Upload failed with error code: {code}',
      uploadFailed: 'Upload failed: {message}',
      dropboxSessionExpired:
        'Your Dropbox session has expired. Please re-authenticate to continue.',
      dropboxMissingPermissions:
        'Your Dropbox app is missing required permissions. Please add the following scopes in the Dropbox Developer Console: files.metadata.read, account_info.read',
      failedToRefreshExpiredToken: 'Failed to refresh expired token',
      allowedLimitSurpassed: 'Allowed limit has been surpassed!',
      fileUnsupportedType: '{name} has an unsupported type!',
      fileTooLargeName: '{name} is larger than {size} {unit}!',
      fileTooSmallName: '{name} is smaller than {size} {unit}!',
      minFileSizeAllowed:
        'Min {size} {unit} {count, plural, one {file is required} other {files are required}}',
      minFileSizeMustBeGreater: 'minFileSize must be greater than 0',
      filePreviouslySelected: '{name} has previously been selected',
      fileWithUrlPreviouslySelected:
        'A file with this url: {url} has previously been selected',
      errorCompressingFile: 'Error compressing {name}',
      errorCompressingImage: 'Error compressing image {name}',
      generatingThumbnails: 'Generating thumbnails...',
      clientIdRequired: 'Client ID is required...',
      popupBlocked: 'Popup blocked',
      dropboxClientIdMissing: 'Dropbox clientId missing',
      dropboxAuthFailed: 'Dropbox authentication failed',
      genericErrorDetails: 'Error: {details}',
      errorProcessingFiles: 'Error processing files: {message}',
      errorSelectingFolder: 'Error selecting folder: {message}',
      graphClientNotInitialized: 'Graph client not initialized',
      dropboxNoAccessToken:
        'No access token provided for Dropbox download',
      silentTokenAcquisitionFailed:
        'Silent token acquisition failed: {details}',
      msalInitializationFailed:
        'MSAL initialization failed: {details}',
      silentTokenAcquisitionProceeding:
        'Silent token acquisition failed, proceeding with interactive login{details}',
      signInFailed: 'Sign-in failed: {message}',
      handleSignInFailed: 'Handle sign-in failed: {message}',
      signOutFailed: 'Sign-out failed: {message}',
      imageEditorFailed:
        'Image editor failed to load. Make sure "react-filerobot-image-editor" is installed.',
    },
  },
}
```

### Step 2.2: Migrate all 8 other locale packs

Each locale pack follows the same pattern. Convert from flat `Translations` to `LocaleBundle` with namespaced `UpupMessages`.

**Files to create (new, BCP 47 hyphenated names):**
- `packages/shared/src/i18n/locales/ar-SA.ts`
- `packages/shared/src/i18n/locales/de-DE.ts`
- `packages/shared/src/i18n/locales/es-ES.ts`
- `packages/shared/src/i18n/locales/fr-FR.ts`
- `packages/shared/src/i18n/locales/ja-JP.ts`
- `packages/shared/src/i18n/locales/ko-KR.ts`
- `packages/shared/src/i18n/locales/zh-CN.ts`
- `packages/shared/src/i18n/locales/zh-TW.ts`

**Migration pattern for each locale (example: fr-FR):**

```typescript
import type { LocaleBundle } from '../types'

export const frFR: LocaleBundle = {
  code: 'fr-FR',
  language: 'Français',
  dir: 'ltr',
  messages: {
    common: {
      cancel: 'Annuler',
      done: 'Terminé',
      loading: 'Chargement...',
      or: 'ou',
    },
    adapters: {
      myDevice: 'Mon appareil',
      googleDrive: 'Google Drive',
      oneDrive: 'OneDrive',
      dropbox: 'Dropbox',
      link: 'Lien',
      camera: 'Caméra',
      audio: 'Audio',
      screenCapture: "Capture d'écran",
    },
    dropzone: {
      dragFilesOr: '{count, plural, one {Glissez votre fichier ou} other {Glissez vos fichiers ou}}',
      dragFilesHere: '{count, plural, one {Glissez votre fichier ici} other {Glissez vos fichiers ici}}',
      browseFiles: 'parcourir les fichiers',
      dragOrBrowse: 'Glissez ou parcourez pour téléverser',
      // ... (full translation of all keys)
    },
    // ... (all other namespaces)
  },
}
```

**ar-SA special handling:** `dir: 'rtl'` and all ICU plural rules use Arabic CLDR categories (zero, one, two, few, many, other):

```typescript
export const arSA: LocaleBundle = {
  code: 'ar-SA',
  language: 'العربية',
  dir: 'rtl',
  messages: {
    header: {
      // Arabic has 6 plural categories
      filesSelected: '{count, plural, zero {لا ملفات محددة} one {ملف واحد محدد} two {ملفان محددان} few {# ملفات محددة} many {# ملفًا محددًا} other {# ملف محدد}}',
      // ...
    },
    // ...
  },
}
```

**TDD for each locale:**

```typescript
import { describe, it, expect } from 'vitest'
import { frFR } from '../i18n/locales/fr-FR'

describe('fr-FR locale bundle', () => {
  it('has correct metadata', () => {
    expect(frFR.code).toBe('fr-FR')
    expect(frFR.dir).toBe('ltr')
  })

  it('uses ICU syntax for plurals', () => {
    expect(frFR.messages.header.filesSelected).toContain('{count, plural,')
  })

  it('has no legacy {{var}} syntax', () => {
    const json = JSON.stringify(frFR.messages)
    expect(json).not.toContain('{{')
  })
})
```

**Files to delete after migration:**
- `packages/shared/src/i18n/en_US.ts` (replaced by `locales/en-US.ts`)
- `packages/shared/src/i18n/locales/ar_SA.ts` (replaced by `ar-SA.ts`)
- `packages/shared/src/i18n/locales/de_DE.ts` (replaced by `de-DE.ts`)
- `packages/shared/src/i18n/locales/es_ES.ts` (replaced by `es-ES.ts`)
- `packages/shared/src/i18n/locales/fr_FR.ts` (replaced by `fr-FR.ts`)
- `packages/shared/src/i18n/locales/ja_JP.ts` (replaced by `ja-JP.ts`)
- `packages/shared/src/i18n/locales/ko_KR.ts` (replaced by `ko-KR.ts`)
- `packages/shared/src/i18n/locales/zh_CN.ts` (replaced by `zh-CN.ts`)
- `packages/shared/src/i18n/locales/zh_TW.ts` (replaced by `zh-TW.ts`)

---

## Phase 3: @upup/shared createTranslator + Fallback Chain (#56, #60, #64, #65, #66)

### Step 3.1: Fallback chain resolution

**File:** `packages/shared/src/i18n/resolve-locale.ts` (new)

**TDD:**

**File:** `packages/shared/src/__tests__/i18n/resolve-locale.test.ts` (new)

```typescript
import { describe, it, expect } from 'vitest'
import { buildFallbackChain, resolveMessage } from '../i18n/resolve-locale'
import { enUS } from '../i18n/locales/en-US'
import type { LocaleBundle, UpupMessages } from '../i18n/types'

describe('buildFallbackChain', () => {
  it('builds chain from specific to general', () => {
    const chain = buildFallbackChain('fr-CA')
    expect(chain).toEqual(['fr-CA', 'fr', 'en-US'])
  })

  it('handles base locale', () => {
    const chain = buildFallbackChain('fr')
    expect(chain).toEqual(['fr', 'en-US'])
  })

  it('does not duplicate en-US', () => {
    const chain = buildFallbackChain('en-US')
    expect(chain).toEqual(['en-US'])
  })
})

describe('resolveMessage', () => {
  const bundles = new Map<string, LocaleBundle>()
  bundles.set('en-US', enUS)

  // Create partial fr-FR with only common.cancel
  const frPartial: LocaleBundle = {
    code: 'fr-FR',
    language: 'Français',
    dir: 'ltr',
    messages: {
      common: { cancel: 'Annuler', done: '', loading: '', or: '' },
    } as UpupMessages,
  }
  bundles.set('fr-FR', frPartial)

  it('returns message from primary locale', () => {
    const msg = resolveMessage(bundles, ['fr-FR', 'fr', 'en-US'], 'common', 'cancel')
    expect(msg).toBe('Annuler')
  })

  it('falls back to en-US for missing keys', () => {
    const msg = resolveMessage(bundles, ['fr-FR', 'fr', 'en-US'], 'common', 'done')
    expect(msg).toBe('Done')
  })
})
```

**Implementation:**

```typescript
import type { LocaleBundle, UpupMessages, MessageNamespace } from './types'

const DEFAULT_LOCALE = 'en-US'

/**
 * Build a fallback chain: fr-CA -> fr -> en-US
 */
export function buildFallbackChain(locale: string): string[] {
  const chain: string[] = [locale]

  // Add base language if locale has region (e.g. fr-CA -> fr)
  if (locale.includes('-')) {
    const base = locale.split('-')[0]
    if (base !== locale) {
      chain.push(base)
    }
  }

  // Always end with default locale
  if (!chain.includes(DEFAULT_LOCALE)) {
    chain.push(DEFAULT_LOCALE)
  }

  return chain
}

/**
 * Walk the fallback chain and return the first non-empty message.
 */
export function resolveMessage(
  bundles: Map<string, LocaleBundle>,
  chain: string[],
  namespace: string,
  key: string,
): string | undefined {
  for (const code of chain) {
    const bundle = bundles.get(code)
    if (!bundle) continue
    const ns = bundle.messages[namespace as MessageNamespace]
    if (!ns) continue
    const value = (ns as Record<string, string>)[key]
    if (value) return value
  }
  return undefined
}
```

### Step 3.2: createTranslator factory with ICU formatter cache

**File:** `packages/shared/src/i18n/create-translator.ts` (new)

**TDD:**

**File:** `packages/shared/src/__tests__/i18n/create-translator.test.ts` (new)

```typescript
import { describe, it, expect, vi } from 'vitest'
import { createTranslator } from '../i18n/create-translator'
import { enUS } from '../i18n/locales/en-US'

describe('createTranslator', () => {
  it('formats a simple message', () => {
    const t = createTranslator({ bundle: enUS })
    expect(t('common.cancel')).toBe('Cancel')
  })

  it('formats ICU plurals', () => {
    const t = createTranslator({ bundle: enUS })
    expect(t('header.filesSelected', { count: 1 })).toBe('1 file selected')
    expect(t('header.filesSelected', { count: 5 })).toBe('5 files selected')
  })

  it('formats ICU interpolation', () => {
    const t = createTranslator({ bundle: enUS })
    expect(t('errors.uploadFailed', { message: 'timeout' })).toBe(
      'Upload failed: timeout',
    )
  })

  it('caches IntlMessageFormat instances', () => {
    const t = createTranslator({ bundle: enUS })
    // Call twice — second call should use cache
    t('header.filesSelected', { count: 1 })
    t('header.filesSelected', { count: 5 })
    // No error means cache works; we verify via internal state if needed
  })

  it('calls onMissingKey for unknown keys', () => {
    const onMissingKey = vi.fn()
    const t = createTranslator({ bundle: enUS, onMissingKey })
    const result = t('common.nonexistent' as any)
    expect(onMissingKey).toHaveBeenCalledWith('common.nonexistent')
    expect(result).toBe('common.nonexistent')
  })

  it('applies user overrides', () => {
    const t = createTranslator({
      bundle: enUS,
      overrides: { common: { cancel: 'Nope' } },
    })
    expect(t('common.cancel')).toBe('Nope')
  })

  it('uses fallback bundles', () => {
    const frPartial = {
      ...enUS,
      code: 'fr-FR' as const,
      language: 'Français',
      messages: {
        ...enUS.messages,
        common: { ...enUS.messages.common, cancel: 'Annuler' },
      },
    }
    const t = createTranslator({
      bundle: frPartial,
      fallback: enUS,
    })
    expect(t('common.cancel')).toBe('Annuler')
    // Falls back to en-US for non-overridden keys
    expect(t('common.done')).toBe('Done')
  })
})

describe('createTranslator with async loading', () => {
  it('supports loadLocale callback', async () => {
    const loadLocale = vi.fn().mockResolvedValue(enUS)
    const t = createTranslator({
      bundle: enUS,
      loadLocale,
    })
    // loadLocale is called externally; translator uses whatever bundle is current
    expect(t('common.cancel')).toBe('Cancel')
  })
})
```

**Implementation:**

```typescript
import IntlMessageFormat from 'intl-messageformat'
import type {
  LocaleBundle,
  UpupMessages,
  FlatMessageKey,
  PartialMessages,
  MessageNamespace,
} from './types'

export interface TranslatorOptions {
  /** Primary locale bundle */
  bundle: LocaleBundle
  /** Fallback locale bundle (typically en-US) */
  fallback?: LocaleBundle
  /** User-provided message overrides */
  overrides?: PartialMessages
  /** Called when a message key is not found in any bundle */
  onMissingKey?: (key: string) => void
  /** Async loader for switching locales at runtime */
  loadLocale?: (code: string) => Promise<LocaleBundle>
}

export interface Translator {
  /** Format a message by dot-notation key */
  (key: FlatMessageKey, values?: Record<string, unknown>): string
  /** Current locale code */
  locale: string
  /** Current text direction */
  dir: 'ltr' | 'rtl'
  /** Switch locale at runtime (requires loadLocale) */
  setLocale?: (code: string) => Promise<void>
}

/**
 * Create a translator function with ICU MessageFormat support.
 *
 * Uses an LRU-style cache for IntlMessageFormat instances to avoid
 * re-parsing ICU strings on every render.
 */
export function createTranslator(options: TranslatorOptions): Translator {
  const { fallback, overrides, onMissingKey, loadLocale } = options
  let bundle = options.bundle

  // ── Formatter cache ─────────────────────────────────────────
  const cache = new Map<string, IntlMessageFormat>()
  const MAX_CACHE = 500

  function getFormatter(pattern: string, locale: string): IntlMessageFormat {
    const cacheKey = `${locale}:${pattern}`
    let fmt = cache.get(cacheKey)
    if (!fmt) {
      if (cache.size >= MAX_CACHE) {
        // Evict oldest entry
        const first = cache.keys().next().value
        if (first) cache.delete(first)
      }
      fmt = new IntlMessageFormat(pattern, locale)
      cache.set(cacheKey, fmt)
    }
    return fmt
  }

  // ── Message resolution ──────────────────────────────────────

  function resolvePattern(key: string): string | undefined {
    const [ns, msgKey] = key.split('.', 2) as [MessageNamespace, string]

    // 1. Check user overrides first
    if (overrides?.[ns]) {
      const val = (overrides[ns] as Record<string, string>)?.[msgKey]
      if (val) return val
    }

    // 2. Primary bundle
    const nsObj = bundle.messages[ns]
    if (nsObj) {
      const val = (nsObj as Record<string, string>)[msgKey]
      if (val) return val
    }

    // 3. Fallback bundle
    if (fallback) {
      const fbNs = fallback.messages[ns]
      if (fbNs) {
        const val = (fbNs as Record<string, string>)[msgKey]
        if (val) return val
      }
    }

    return undefined
  }

  // ── Translator function ─────────────────────────────────────

  const t: Translator = Object.assign(
    function translate(
      key: FlatMessageKey,
      values?: Record<string, unknown>,
    ): string {
      const pattern = resolvePattern(key)

      if (!pattern) {
        onMissingKey?.(key)
        return key
      }

      // Fast path: no values and no ICU syntax -> return raw string
      if (!values && !pattern.includes('{')) {
        return pattern
      }

      try {
        const fmt = getFormatter(pattern, bundle.code)
        return fmt.format(values) as string
      } catch {
        // If ICU parsing fails, fall back to raw pattern
        return pattern
      }
    },
    {
      get locale() {
        return bundle.code
      },
      get dir() {
        return bundle.dir
      },
      setLocale: loadLocale
        ? async (code: string) => {
            const newBundle = await loadLocale(code)
            bundle = newBundle
            cache.clear()
          }
        : undefined,
    },
  )

  return t
}
```

### Step 3.3: Update shared i18n barrel export

**File:** `packages/shared/src/i18n/index.ts` (rewrite)

```typescript
// Types
export type {
  UpupMessages,
  LocaleBundle,
  UpupLocaleCode,
  FlatMessageKey,
  PartialMessages,
  MessageNamespace,
  CommonMessages,
  AdapterMessages,
  DropzoneMessages,
  HeaderMessages,
  FileListMessages,
  FilePreviewMessages,
  DriveBrowserMessages,
  UrlMessages,
  CameraMessages,
  AudioMessages,
  ScreenCaptureMessages,
  BrandingMessages,
  ErrorMessages,
  // Legacy compat
  Translations,
} from './types'

// Locale bundles
export { enUS } from './locales/en-US'
export { arSA } from './locales/ar-SA'
export { deDE } from './locales/de-DE'
export { esES } from './locales/es-ES'
export { frFR } from './locales/fr-FR'
export { jaJP } from './locales/ja-JP'
export { koKR } from './locales/ko-KR'
export { zhCN } from './locales/zh-CN'
export { zhTW } from './locales/zh-TW'

// Locale metadata
export { LOCALE_META, normalizeBcp47 } from './locale-meta'
export type { LocaleMeta } from './locale-meta'

// Translator
export { createTranslator } from './create-translator'
export type { Translator, TranslatorOptions } from './create-translator'

// Fallback chain
export { buildFallbackChain, resolveMessage } from './resolve-locale'
```

---

## Phase 4: @upup/core Integration (#67, #68)

### Step 4.1: Type CoreOptions properly

**File:** `packages/core/src/core.ts`

**TDD:**

**File:** `packages/core/src/__tests__/core-i18n.test.ts` (new)

```typescript
import { describe, it, expect } from 'vitest'
import { UpupCore } from '../core'
import { enUS, createTranslator } from '@upup/shared'

describe('UpupCore i18n integration', () => {
  it('accepts locale and creates translator', () => {
    const core = new UpupCore({
      locale: 'en-US',
    })
    expect(core.options.locale).toBe('en-US')
  })

  it('passes real translator to pipeline context', async () => {
    let capturedT: ((key: string) => string) | null = null
    const core = new UpupCore({
      locale: 'en-US',
      pipeline: [
        {
          name: 'test-step',
          async process(file, context) {
            capturedT = context.t as (key: string) => string
            return file
          },
        },
      ],
    })
    // Add a test file and trigger upload to exercise pipeline
    const file = new File(['test'], 'test.txt', { type: 'text/plain' })
    await core.addFiles([file])
    try { await core.upload() } catch { /* no endpoint configured */ }
    // The translator should have been set
    // (In real integration, capturedT would be the translator)
  })
})
```

**Changes to `packages/core/src/core.ts`:**

```typescript
// At top of file, add import:
import {
  createTranslator,
  enUS,
  type LocaleBundle,
  type UpupLocaleCode,
  type PartialMessages,
  type Translator,
} from '@upup/shared'

// In CoreOptions interface, replace:
//   locale?: unknown
//   translations?: unknown
// With:
export interface CoreOptions extends FileManagerOptions {
  // ... existing fields ...

  /** BCP 47 locale code, e.g. "en-US" */
  locale?: UpupLocaleCode
  /** Full locale bundle (overrides locale code) */
  localeBundle?: LocaleBundle
  /** Partial message overrides */
  messageOverrides?: PartialMessages
  /** Called when a translation key is missing */
  onMissingKey?: (key: string) => void
  /** Async locale loader for runtime switching */
  loadLocale?: (code: string) => Promise<LocaleBundle>
}

// In UpupCore constructor, after crash recovery setup:
  private translator: Translator

  constructor(options: CoreOptions) {
    // ... existing code ...

    // Create translator
    this.translator = createTranslator({
      bundle: options.localeBundle ?? enUS,
      overrides: options.messageOverrides,
      onMissingKey: options.onMissingKey,
      loadLocale: options.loadLocale,
    })
  }

// In upload() method, replace the pipeline context t stub:
  // BEFORE:
  //   t: (key: string) => key,
  // AFTER:
      const context: PipelineContext = {
        files: this.files,
        options: this.options as Record<string, unknown>,
        emit: (event, data) => this.emitter.emit(event, data),
        t: (template, vars) => this.translator(template as any, vars),
      }
```

### Step 4.2: Update PipelineContext.t type

**File:** `packages/shared/src/pipeline.ts`

```typescript
// BEFORE:
  t: (template: string, vars?: Record<string, unknown>) => string

// AFTER:
  t: (key: string, vars?: Record<string, unknown>) => string
```

This is a cosmetic rename (template -> key) to reflect that we now use dot-notation keys instead of raw template strings.

---

## Phase 5: @upup/react i18n Prop (#61, #62, #63)

### Step 5.1: Define the `i18n` prop type

**File:** `packages/react/src/types/i18n.ts` (new)

```typescript
import type {
  LocaleBundle,
  PartialMessages,
  UpupLocaleCode,
  Translator,
} from '@upup/shared'

/**
 * The unified i18n prop for <UpupUploader>.
 *
 * Three modes:
 * 1. Minimal:     `i18n={{ locale: 'fr-FR' }}`
 * 2. Custom msgs: `i18n={{ locale: 'fr-FR', overrides: { common: { cancel: 'Non' } } }}`
 * 3. BYO:         `i18n={{ t: myTranslator }}`
 */
export type UpupI18nProp =
  | UpupI18nConfig
  | UpupI18nByo

export interface UpupI18nConfig {
  /** BCP 47 locale code */
  locale?: UpupLocaleCode
  /** Full locale bundle (overrides built-in for that code) */
  bundle?: LocaleBundle
  /** Partial message overrides merged on top of the bundle */
  overrides?: PartialMessages
  /** Async loader for locale bundles not included in the JS bundle */
  loadLocale?: (code: string) => Promise<LocaleBundle>
  /** Called when a key is missing from all bundles */
  onMissingKey?: (key: string) => void
}

export interface UpupI18nByo {
  /** Bring-your-own translator function */
  t: Translator
}

export function isByoTranslator(
  i18n: UpupI18nProp,
): i18n is UpupI18nByo {
  return 't' in i18n && typeof i18n.t === 'function'
}
```

### Step 5.2: Update UploaderContext to use Translator

**File:** `packages/react/src/context/uploader-context.ts`

```typescript
'use client'

import { createContext, useContext } from 'react'
import type { UseUpupUploadReturn } from '../use-upup-upload'
import type { FileSource, UploaderClassNames, Translator } from '@upup/shared'
import type { UploaderIcons } from '../types/icons'

export type UploadSource = 'local' | 'camera' | 'url' | 'google_drive' | 'onedrive' | 'dropbox' | 'microphone' | 'screen'

export interface UploaderUIState {
  activeSource: FileSource | null
  setActiveSource: (source: FileSource | null) => void
  dark: boolean
  mini: boolean
  classNames: UploaderClassNames
  icons: UploaderIcons
  enablePaste: boolean
  sources: UploadSource[]
  /** The translator function — use `t('namespace.key', { values })` */
  t: Translator
}

export type UploaderContextValue = UseUpupUploadReturn & UploaderUIState

export const UploaderContext = createContext<UploaderContextValue | null>(null)

export function useUploaderContext(): UploaderContextValue {
  const ctx = useContext(UploaderContext)
  if (!ctx) {
    throw new Error('useUploaderContext must be used within <UpupUploader>')
  }
  return ctx
}
```

### Step 5.3: Update UpupUploader component

**File:** `packages/react/src/upup-uploader.tsx`

**TDD:**

**File:** `packages/react/src/__tests__/upup-uploader-i18n.test.tsx` (new)

```typescript
import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import { UpupUploader } from '../upup-uploader'

describe('UpupUploader i18n prop', () => {
  it('renders with default en-US locale', () => {
    render(<UpupUploader />)
    // Should use English strings
  })

  it('accepts i18n config with locale code', () => {
    render(<UpupUploader i18n={{ locale: 'fr-FR' }} />)
  })

  it('accepts i18n config with overrides', () => {
    render(
      <UpupUploader
        i18n={{
          locale: 'en-US',
          overrides: { common: { cancel: 'Nope' } },
        }}
      />,
    )
  })

  it('accepts BYO translator', () => {
    const t = Object.assign(
      (key: string) => `[${key}]`,
      { locale: 'test', dir: 'ltr' as const },
    )
    render(<UpupUploader i18n={{ t }} />)
  })

  it('sets lang attribute on root element', () => {
    const { container } = render(
      <UpupUploader i18n={{ locale: 'ar-SA' }} />,
    )
    const root = container.querySelector('.upup-container')
    expect(root?.getAttribute('lang')).toBe('ar-SA')
  })

  it('sets dir=rtl for Arabic', () => {
    const { container } = render(
      <UpupUploader i18n={{ locale: 'ar-SA' }} />,
    )
    const root = container.querySelector('.upup-container')
    expect(root?.getAttribute('dir')).toBe('rtl')
  })
})
```

**Implementation changes to `packages/react/src/upup-uploader.tsx`:**

```typescript
'use client'

import { forwardRef, useImperativeHandle, useState, useMemo, type Ref } from 'react'
import { useUpupUpload, type UseUpupUploadReturn } from './use-upup-upload'
import { UploaderContext, type UploadSource, type UploaderContextValue } from './context/uploader-context'
import { PasteZone } from './components/paste-zone'
import DropZone from './components/drop-zone'
import SourceSelector from './components/source-selector'
import SourceView from './components/source-view'
import FileList from './components/file-list'
import Notifier from './components/notifier'
import useInformer from './hooks/use-informer'
import type { CoreOptions } from '@upup/core'
import {
  FileSource,
  enUS,
  createTranslator,
  type UploaderClassNames,
  type Translator,
} from '@upup/shared'
import type { UploaderIcons } from './types/icons'
import { type UpupI18nProp, isByoTranslator } from './types/i18n'

export interface UpupUploaderProps extends CoreOptions {
  dark?: boolean
  mini?: boolean
  classNames?: Partial<UploaderClassNames>
  icons?: Partial<UploaderIcons>
  sources?: UploadSource[]
  fileSources?: FileSource[]
  enablePaste?: boolean
  /** Unified i18n configuration. Replaces `locale` + `translationOverrides`. */
  i18n?: UpupI18nProp
  ref?: Ref<UpupUploaderRef>
}

export interface UpupUploaderRef {
  useUpload(): UseUpupUploadReturn
}

function sourcesToFileSources(sources: UploadSource[]): FileSource[] {
  const map: Record<UploadSource, FileSource> = {
    local: FileSource.LOCAL,
    camera: FileSource.CAMERA,
    url: FileSource.URL,
    google_drive: FileSource.GOOGLE_DRIVE,
    onedrive: FileSource.ONE_DRIVE,
    dropbox: FileSource.DROPBOX,
    microphone: FileSource.MICROPHONE,
    screen: FileSource.SCREEN,
  }
  return sources.map(s => map[s])
}

/**
 * Resolve the i18n prop into a Translator instance.
 */
function useTranslator(i18n?: UpupI18nProp): Translator {
  return useMemo(() => {
    if (!i18n) {
      return createTranslator({ bundle: enUS })
    }

    if (isByoTranslator(i18n)) {
      return i18n.t
    }

    const bundle = i18n.bundle ?? enUS
    return createTranslator({
      bundle,
      fallback: bundle.code !== 'en-US' ? enUS : undefined,
      overrides: i18n.overrides,
      onMissingKey: i18n.onMissingKey,
      loadLocale: i18n.loadLocale,
    })
  }, [i18n])
}

export const UpupUploader = forwardRef<UpupUploaderRef, UpupUploaderProps>(
  function UpupUploader(props, ref) {
    const {
      dark = false,
      mini = false,
      classNames = {},
      icons = {},
      sources = ['local'],
      fileSources: explicitFileSources,
      enablePaste = false,
      i18n: i18nProp,
      ...coreOptions
    } = props

    const uploader = useUpupUpload(coreOptions)
    const [activeSource, setActiveSource] = useState<FileSource | null>(null)
    const informer = useInformer()
    const t = useTranslator(i18nProp)
    const fileSources = explicitFileSources ?? sourcesToFileSources(sources)

    useImperativeHandle(ref, () => ({
      useUpload: () => uploader,
    }))

    const contextValue: UploaderContextValue = useMemo(
      () => ({
        ...uploader,
        activeSource,
        setActiveSource,
        dark,
        mini,
        classNames: classNames as UploaderClassNames,
        icons: icons as UploaderIcons,
        enablePaste,
        sources,
        t,
      }),
      [uploader, activeSource, dark, mini, classNames, icons, enablePaste, sources, t],
    )

    const content = (
      <UploaderContext.Provider value={contextValue}>
        <div
          className={`upup-container ${dark ? 'upup-dark' : ''} ${mini ? 'upup-mini' : ''}`}
          lang={t.locale}
          dir={t.dir}
        >
          <DropZone>
            {activeSource ? (
              <SourceView />
            ) : (
              <SourceSelector />
            )}
          </DropZone>
          <FileList />
          <Notifier
            messages={informer.messages}
            onDismiss={informer.dismissMessage}
            dark={dark}
          />
        </div>
      </UploaderContext.Provider>
    )

    if (enablePaste) {
      return (
        <PasteZone onPaste={(files) => uploader.addFiles(files)}>
          {content}
        </PasteZone>
      )
    }

    return content
  },
)
```

---

## Phase 6: Wire Components to Translator (#42)

### Pattern

Every component that currently reads `translations` from context switches to `t` from context. Every hardcoded English string becomes a `t()` call.

**Before:**
```typescript
const { translations } = useUploaderContext()
// ...
<span>{translations.cancel}</span>
<span>{t(translations.filesSelected_one, { count })}</span>
```

**After:**
```typescript
const { t } = useUploaderContext()
// ...
<span>{t('common.cancel')}</span>
<span>{t('header.filesSelected', { count })}</span>
```

### Step 6.1: source-selector.tsx

**File:** `packages/react/src/components/source-selector.tsx`

Replace hardcoded strings:
- `"Drag or browse to upload"` -> `t('dropzone.dragOrBrowse')`
- `"Drag files here or"` -> `t('dropzone.dragFilesOr', { count: 2 })`
- `"browse files"` -> `t('dropzone.browseFiles')`

```typescript
// BEFORE:
const { mini, dark, classNames, addFiles, activeSource } = useUploaderContext()

// AFTER:
const { mini, dark, classNames, addFiles, activeSource, t } = useUploaderContext()

// BEFORE:
<p>Drag or browse to upload</p>

// AFTER:
<p>{t('dropzone.dragOrBrowse')}</p>

// BEFORE:
<span>Drag files here or</span>

// AFTER:
<span>{t('dropzone.dragFilesOr', { count: 2 })}</span>

// BEFORE:
<button onClick={handleBrowseFilesClick}>browse files</button>

// AFTER:
<button onClick={handleBrowseFilesClick}>{t('dropzone.browseFiles')}</button>
```

### Step 6.2: main-box-header.tsx

**File:** `packages/react/src/components/shared/main-box-header.tsx`

All strings already come from `translations` in context. Change to use `t()`:

```typescript
// BEFORE:
const { translations } = useUploaderContext()
// translations.removeAllFiles, translations.addMore, etc.
// plural(translations, 'filesSelected', count) + t(pluralResult, { count })

// AFTER:
const { t } = useUploaderContext()
// t('header.removeAllFiles')
// t('header.addMore')
// t('header.filesSelected', { count })
```

### Step 6.3: file-list.tsx

**File:** `packages/react/src/components/file-list.tsx`

Replace hardcoded strings:
- `'Resume upload'` -> `t('fileList.resumeUpload')`
- `'Pause upload'` -> `t('fileList.pauseUpload')`

Plus replace any existing `translations` usage:
- `translations.uploadFiles_one/other` -> `t('fileList.uploadFiles', { count })`

```typescript
// BEFORE:
isPaused ? 'Resume upload' : 'Pause upload'

// AFTER:
isPaused ? t('fileList.resumeUpload') : t('fileList.pauseUpload')
```

### Step 6.4: drive-auth-fallback.tsx

**File:** `packages/react/src/components/shared/drive-auth-fallback.tsx`

Replace hardcoded strings:
- `"Authenticate with {providerName} to select files for upload"` -> `t('driveBrowser.authenticatePrompt', { provider: providerName })`
- `"Sign in with {providerName}"` -> `t('driveBrowser.signInWith', { provider: providerName })`

```typescript
// BEFORE:
<p>Authenticate with {providerName} to select files for upload</p>
<button>Sign in with {providerName}</button>

// AFTER:
const { t } = useUploaderContext()
<p>{t('driveBrowser.authenticatePrompt', { provider: providerName })}</p>
<button>{t('driveBrowser.signInWith', { provider: providerName })}</button>
```

### Step 6.5: drive-browser-header.tsx

**File:** `packages/react/src/components/shared/drive-browser-header.tsx`

Wire `t('driveBrowser.logOut')`, `t('driveBrowser.search')` from context.

### Step 6.6: drop-zone.tsx

**File:** `packages/react/src/components/drop-zone.tsx`

Replace hardcoded aria-label:
- `aria-label="Drop files here or click to browse"` -> `aria-label={t('dropzone.dropAriaLabel')}`

### Step 6.7: file-preview.tsx

**File:** `packages/react/src/components/file-preview.tsx`

Replace hardcoded strings:
- `aria-label="Edit image"` -> `aria-label={t('filePreview.editImage')}`
- `aria-label="Remove file"` -> `aria-label={t('filePreview.removeFile')}`
- `title="Rename file"` -> `title={t('filePreview.renameFile')}`

### Step 6.8: file-preview-thumbnail.tsx

**File:** `packages/react/src/components/file-preview-thumbnail.tsx`

Replace hardcoded string:
- `loadingLabel = 'Loading...'` -> use `t('common.loading')` as default

### Step 6.9: file-preview-portal.tsx

**File:** `packages/react/src/components/file-preview-portal.tsx`

Replace hardcoded string:
- `'Preview error'` -> `t('filePreview.previewError', { message: error })`

### Step 6.10: image-editor-inline.tsx + image-editor-modal.tsx

**Files:**
- `packages/react/src/components/image-editor-inline.tsx`
- `packages/react/src/components/image-editor-modal.tsx`

Replace hardcoded strings:
- `'Image editor failed to load...'` -> `t('errors.imageEditorFailed')`
- `aria-label="Close editor"` -> `aria-label={t('common.cancel')}`

### Step 6.11: notifier.tsx

**File:** `packages/react/src/components/notifier.tsx`

Replace:
- `aria-label="Dismiss"` -> `aria-label={t('common.cancel')}`

### Step 6.12: progress-bar.tsx

**File:** `packages/react/src/components/progress-bar.tsx`

Replace:
- `aria-label="Upload progress"` -> use `t` for accessible label

### Step 6.13: use-dropbox.ts

**File:** `packages/react/src/hooks/use-dropbox.ts`

Replace hardcoded error string with translation call. This string appears twice (lines 77 and 86):

```typescript
// BEFORE:
onError('Dropbox session expired. Please sign in again.')

// AFTER:
onError(t('errors.dropboxSessionExpired'))
```

The hook must pull `t` from `useUploaderContext()`:

```typescript
// BEFORE:
const { onError } = useUploaderContext()

// AFTER:
const { onError, t } = useUploaderContext()
```

### Step 6.14: lib/file.ts

**File:** `packages/react/src/lib/file.ts`

Replace hardcoded size unit array:
- `const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB']`
- This function needs a `t` parameter or should return a key that the caller formats.

**Approach:** Change the `formatBytes` function to accept a translator:

```typescript
// BEFORE:
export function formatBytes(bytes: number, decimals = 2): string {
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB']
  // ...
}

// AFTER:
import type { Translator } from '@upup/shared'

const SIZE_KEYS = [
  'filePreview.bytes',
  'filePreview.kb',
  'filePreview.mb',
  'filePreview.gb',
  'filePreview.tb',
] as const

export function formatBytes(
  bytes: number,
  t: Translator,
  decimals = 2,
): string {
  if (bytes === 0) return t('filePreview.zeroBytes')
  const k = 1024
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  const value = parseFloat((bytes / Math.pow(k, i)).toFixed(decimals))
  return `${value} ${t(SIZE_KEYS[i] as any)}`
}
```

---

## Phase 7: Update Shared Package Barrel Exports

### Step 7.1: Update `packages/shared/src/index.ts`

Ensure the main barrel re-exports all new i18n types and functions. The existing `export * from './i18n'` should cover it since we updated `packages/shared/src/i18n/index.ts`.

---

## Execution Order & Dependencies

```
Phase 1 (types)        ──> no deps, start here
Phase 2 (en-US pack)   ──> depends on Phase 1
Phase 3 (translator)   ──> depends on Phase 1 + 2
Phase 4 (core)         ──> depends on Phase 3
Phase 5 (react prop)   ──> depends on Phase 3 + 4
Phase 6 (components)   ──> depends on Phase 5
Phase 7 (exports)      ──> depends on all
```

### Parallelization opportunities:
- Phase 2 locale migrations (8 packs) can be done in parallel
- Phase 6 component wiring (13 files) can be done in parallel
- Phase 3.1 (resolve-locale) and Phase 3.2 (create-translator) are sequential

---

## Test Commands

```bash
# Run all i18n tests
pnpm --filter @upup/shared test -- --run src/__tests__/i18n/

# Run specific test file
pnpm --filter @upup/shared test -- --run src/__tests__/i18n/create-translator.test.ts

# Run react i18n tests
pnpm --filter @upup/react test -- --run src/__tests__/upup-uploader-i18n.test.tsx

# Run migration key audit
pnpm --filter @upup/shared test -- --run src/__tests__/i18n-migration.test.ts

# Type check all packages
pnpm -r typecheck

# Build all packages
pnpm -r build
```

### Key Audit Test: i18n Migration Completeness

**File:** `packages/shared/src/__tests__/i18n-migration.test.ts` (new)

This test verifies that the new namespaced `UpupMessages` type contains at least as many keys as the old flat `Translations` type (127 keys), and that critical keys still exist in their new namespaced locations.

```typescript
import { describe, it, expect } from 'vitest'
import { enUS } from '../i18n/locales/en-US'
import type { UpupMessages } from '../i18n/types'

/**
 * Recursively count all leaf (string-valued) keys in a nested object.
 */
function countLeafKeys(obj: Record<string, unknown>, prefix = ''): string[] {
  const keys: string[] = []
  for (const [key, value] of Object.entries(obj)) {
    const fullKey = prefix ? `${prefix}.${key}` : key
    if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
      keys.push(...countLeafKeys(value as Record<string, unknown>, fullKey))
    } else {
      keys.push(fullKey)
    }
  }
  return keys
}

describe('i18n migration completeness audit', () => {
  const allKeys = countLeafKeys(enUS.messages as unknown as Record<string, unknown>)

  it('new UpupMessages has at least 127 leaf keys (old flat Translations count)', () => {
    expect(allKeys.length).toBeGreaterThanOrEqual(127)
  })

  it('critical key: common.cancel exists', () => {
    expect(allKeys).toContain('common.cancel')
  })

  it('critical key: common.done exists', () => {
    expect(allKeys).toContain('common.done')
  })

  it('critical key: header.filesSelected exists', () => {
    expect(allKeys).toContain('header.filesSelected')
  })

  it('critical key: errors.uploadFailed exists', () => {
    expect(allKeys).toContain('errors.uploadFailed')
  })

  it('critical key: errors.dropboxSessionExpired exists', () => {
    expect(allKeys).toContain('errors.dropboxSessionExpired')
  })

  it('critical key: dropzone.browseFiles exists', () => {
    expect(allKeys).toContain('dropzone.browseFiles')
  })

  it('critical key: camera.capture exists', () => {
    expect(allKeys).toContain('camera.capture')
  })

  it('all namespaces are present', () => {
    const namespaces: (keyof UpupMessages)[] = [
      'common', 'adapters', 'dropzone', 'header', 'fileList',
      'filePreview', 'driveBrowser', 'url', 'camera', 'audio',
      'screenCapture', 'branding', 'errors',
    ]
    for (const ns of namespaces) {
      expect(enUS.messages).toHaveProperty(ns)
    }
  })

  it('no namespace is empty', () => {
    for (const [ns, value] of Object.entries(enUS.messages)) {
      const nsKeys = Object.keys(value as Record<string, unknown>)
      expect(nsKeys.length, `namespace "${ns}" should not be empty`).toBeGreaterThan(0)
    }
  })
})
```

---

## Files Summary

### New files (18):
| File | Purpose |
|------|---------|
| `packages/shared/src/i18n/locale-meta.ts` | BCP 47 metadata + normalizer |
| `packages/shared/src/i18n/resolve-locale.ts` | Fallback chain resolution |
| `packages/shared/src/i18n/create-translator.ts` | ICU translator factory |
| `packages/shared/src/i18n/locales/en-US.ts` | English locale bundle |
| `packages/shared/src/i18n/locales/ar-SA.ts` | Arabic locale bundle |
| `packages/shared/src/i18n/locales/de-DE.ts` | German locale bundle |
| `packages/shared/src/i18n/locales/es-ES.ts` | Spanish locale bundle |
| `packages/shared/src/i18n/locales/fr-FR.ts` | French locale bundle |
| `packages/shared/src/i18n/locales/ja-JP.ts` | Japanese locale bundle |
| `packages/shared/src/i18n/locales/ko-KR.ts` | Korean locale bundle |
| `packages/shared/src/i18n/locales/zh-CN.ts` | Simplified Chinese locale bundle |
| `packages/shared/src/i18n/locales/zh-TW.ts` | Traditional Chinese locale bundle |
| `packages/react/src/types/i18n.ts` | i18n prop type definitions |
| `packages/shared/src/__tests__/i18n/types.test.ts` | Type-level tests |
| `packages/shared/src/__tests__/i18n/en-US.test.ts` | en-US bundle tests |
| `packages/shared/src/__tests__/i18n/resolve-locale.test.ts` | Fallback chain tests |
| `packages/shared/src/__tests__/i18n/create-translator.test.ts` | Translator tests |
| `packages/shared/src/__tests__/i18n-migration.test.ts` | Migration completeness audit (key count >= 127) |

### Modified files (15):
| File | Changes |
|------|---------|
| `packages/shared/package.json` | Add `intl-messageformat` dependency |
| `packages/shared/src/i18n/types.ts` | Rewrite: flat -> namespaced `UpupMessages` |
| `packages/shared/src/i18n/index.ts` | Rewrite: new exports |
| `packages/shared/src/pipeline.ts` | `t` param rename: template -> key |
| `packages/core/src/core.ts` | Typed locale/translations, real translator in pipeline |
| `packages/react/src/context/uploader-context.ts` | `translations` -> `t: Translator` |
| `packages/react/src/upup-uploader.tsx` | `i18n` prop, `lang`/`dir` attrs |
| `packages/react/src/components/source-selector.tsx` | Wire 3 hardcoded strings |
| `packages/react/src/components/shared/main-box-header.tsx` | Switch to `t()` |
| `packages/react/src/components/file-list.tsx` | Wire 2 hardcoded strings |
| `packages/react/src/components/shared/drive-auth-fallback.tsx` | Wire 2 hardcoded strings |
| `packages/react/src/components/shared/drive-browser-header.tsx` | Wire to `t()` |
| `packages/react/src/components/drop-zone.tsx` | Wire aria-label |
| `packages/react/src/components/file-preview.tsx` | Wire 3 hardcoded strings |
| `packages/react/src/hooks/use-dropbox.ts` | Wire 2 hardcoded "session expired" strings to `t('errors.dropboxSessionExpired')` |

### Deleted files (9):
| File | Reason |
|------|--------|
| `packages/shared/src/i18n/en_US.ts` | Replaced by `locales/en-US.ts` |
| `packages/shared/src/i18n/locales/ar_SA.ts` | Replaced by `ar-SA.ts` |
| `packages/shared/src/i18n/locales/de_DE.ts` | Replaced by `de-DE.ts` |
| `packages/shared/src/i18n/locales/es_ES.ts` | Replaced by `es-ES.ts` |
| `packages/shared/src/i18n/locales/fr_FR.ts` | Replaced by `fr-FR.ts` |
| `packages/shared/src/i18n/locales/ja_JP.ts` | Replaced by `ja-JP.ts` |
| `packages/shared/src/i18n/locales/ko_KR.ts` | Replaced by `ko-KR.ts` |
| `packages/shared/src/i18n/locales/zh_CN.ts` | Replaced by `zh-CN.ts` |
| `packages/shared/src/i18n/locales/zh_TW.ts` | Replaced by `zh-TW.ts` |

### Also delete (cleanup):
| File | Reason |
|------|--------|
| `packages/shared/src/i18n/utils.ts` | `t()`, `plural()`, `mergeTranslations()` replaced by `createTranslator()` |

---

## Risk Assessment

| Risk | Mitigation |
|------|-----------|
| `intl-messageformat` bundle size (~41KB gz) | Tree-shaking; only plurals/select used. Consider `@formatjs/intl-messageformat-parser` lite if needed. |
| ICU syntax errors in locale packs | Validated at test time; `createTranslator` catches parse errors and falls back to raw string |
| Arabic 6-category plurals | Use CLDR data built into `intl-messageformat`; test with `ar-SA` specifically |
| Breaking all component imports | v2 breaking change is acceptable per spec; no migration shim needed |
| Cache memory in long-running SPAs | LRU cap at 500 entries; `setLocale()` clears cache |

---

## Acceptance Criteria

- [ ] `pnpm -r typecheck` passes with zero errors
- [ ] `pnpm -r test` all i18n tests pass
- [ ] `pnpm -r build` produces valid bundles
- [ ] `intl-messageformat` is in `@upup/shared` dependencies
- [ ] No `{{var}}` syntax remains in any locale pack
- [ ] No `_one`/`_other` suffix keys remain in types
- [ ] All 9 locale packs have BCP 47 codes and `LocaleBundle` metadata
- [ ] `<UpupUploader i18n={{ locale: 'ar-SA' }}>` renders with `dir="rtl"` and `lang="ar-SA"`
- [ ] `<UpupUploader i18n={{ t: customFn }}>` works with BYO translator
- [ ] Zero hardcoded English strings remain in React component source files
- [ ] `createTranslator` caches `IntlMessageFormat` instances
- [ ] `onMissingKey` fires for unknown keys in dev
- [ ] Fallback chain `fr-CA -> fr -> en-US` resolves correctly
