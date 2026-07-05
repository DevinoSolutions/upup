import { describe, it, expect } from 'vitest'
import * as core from '@upup/core'

// Compile-time reachability checks for the three types/ sub-barrel files
// F-602 says are omitted (context-shapes, core-events, uploader-options).
// These types are erased at runtime (all three source files are export-type-only
// -- verified: zero `export const`/`export function` in any of them), so the
// oracle for this half of the assertion is `pnpm --filter @upup/core typecheck`,
// not this file's vitest run (per the plan's binding executor note 3). A relative
// import is used because `@upup/core/src/types` is not on the package `exports`
// map and would not resolve.
import type { BaseContextUpload } from '../src/types'
import type { CoreEvents } from '../src/types'
import type { UploadSource, UploadProvider } from '../src/types'

// eslint-disable-next-line @typescript-eslint/no-unused-vars
type _TypesBarrelExposesContextShapes = BaseContextUpload
// eslint-disable-next-line @typescript-eslint/no-unused-vars
type _TypesBarrelExposesCoreEvents = CoreEvents
// eslint-disable-next-line @typescript-eslint/no-unused-vars
type _TypesBarrelExposesUploadSource = UploadSource
// eslint-disable-next-line @typescript-eslint/no-unused-vars
type _TypesBarrelExposesUploadProvider = UploadProvider

// Direct-from-'@upup/core' type reachability (these already resolve today via
// index.ts's own manual export lines -- this assertion is about keeping them
// reachable through the curation, not about the sub-barrel completion).
type _CoreExposesUploadSource = core.UploadSource
type _CoreExposesUploadProvider = core.UploadProvider
type _CoreExposesCoreEvents = core.CoreEvents

describe('@upup/core public API surface (pin test)', () => {
    it('runtime value export list matches the checked-in list', () => {
        // PRE-CURATION SNAPSHOT (P18 Phase B/C checkpoint): this is the
        // uncurated, pre-Phase-D reality (114 names -- everything the fat
        // barrel + both wildcards currently expose), not the target public
        // surface. It exists in this state only so every checkpoint commit
        // through Phase C stays green (the pre-commit hook runs this suite).
        // Proven RED against an empty placeholder via a direct `vitest run`
        // before this list was filled in (see audit/fixes/P18-report.md,
        // Phase B) -- that is this test's TDD red. Phase D2 replaces this
        // array with the final curated public list and this comment.
        const EXPECTED_PUBLIC_VALUE_EXPORTS: string[] = [
            "ACCEPT_PRESETS","BOX_DESCRIPTOR","BoxPlugin","BrowserRuntime","CrashRecoveryManager",
            "DEFAULT_MAX_FILE_SIZE","DEFAULT_SOURCES","DROPBOX_DESCRIPTOR","DirectUpload",
            "DragDropController","DriveBrowserController","DropboxPlugin","EventEmitter",
            "FILE_TYPE_EXTENSIONS","FileManager","FileSource","GOOGLE_DRIVE_DESCRIPTOR",
            "GoogleDrivePlugin","ICONS","IndexedDBStorage","LOCALE_CODES","LOCALE_META",
            "LOCALE_REGISTRY","MIME_EXTENSION_MAP","NON_S3_STORAGE_PROVIDERS","ONE_DRIVE_DESCRIPTOR",
            "OneDrivePlugin","PREVIEW_MAX_TEXT_SIZE","PREVIEW_TEXT_TRUNCATE_LENGTH","PipelineEngine",
            "PluginManager","SSEProcessor","ServerModeDriveController","StorageProvider","ThemeStore",
            "TokenEndpointCredentials","UPUP_VAR_PREFIX","UploadError","UploadErrorType",
            "UploadManager","UploadStatus","UploaderOrchestrator","UpupAuthError","UpupConfigError",
            "UpupCore","UpupError","UpupErrorCode","UpupNetworkError","UpupQuotaError",
            "UpupStorageError","UpupValidationError","arSA","b64EncodeUnicode","bindDriveEvents",
            "blobToUploadFile","buildFallbackChain","bytesToSize","checkFileSize","clearAllSessions",
            "cn","collectDroppedFiles","createChildController","createTranslator",
            "createUploaderController","darkPreset","dataURLtoBlob","deDE","deriveFetchedFileName",
            "enUS","errorCodeToMessageKey","esES","extensionFromMime","fileAppendParams",
            "fileCanPreviewText","fileFingerprint","fileGetExtension","fileGetIsImage","fileGetIsPdf",
            "fileGetIsText","fileIs3D","fileNameFromContentDisposition","fileTypeIconName",
            "flattenSlotsToClassNames","flattenTranslatorToUiTranslations","formatUiMessage","frFR",
            "getDir","isUploadActive","isUploadIdle","jaJP","koKR","lightPreset",
            "loadGoogleIdentityServices","loadSession","normalizeBcp47","normalizeSource",
            "normalizeUploaderOptions","pluralUiMessage","removeSession","resolveAccept",
            "resolveMessage","resolveTheme","revokeAndReplace","revokeFileUrl","sanitizeFileName",
            "saveSession","searchDriveFiles","sizeToBytes","sourceNameKeys","tokensToVarRefs",
            "tokensToVars","updateSessionProgress","zhCN","zhTW",
        ]
        const actual = Object.keys(core).sort()
        expect(actual).toEqual(EXPECTED_PUBLIC_VALUE_EXPORTS)
    })
})
