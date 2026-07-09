import { describe, it, expect } from 'vitest'
import * as core from '@upup/core'
import type * as coreInternal from '@upup/core/internal'

// ─────────────────────────────────────────────────────────────
// How this file's type-level assertions are verified: since 2026-07-07 the
// typecheck gate covers the TEST trees — `pnpm --filter @upup/core typecheck`
// runs `tsconfig.test.json` (include: ["src", "tests"]) after the base
// config, so the type aliases and `@ts-expect-error` directives below ARE
// compiled and enforced by `pnpm run typecheck` (CLAUDE.md, "Gates"). The
// runtime value-list assertion is separately enforced by ordinary
// `vitest run`. (This note previously documented the pre-2026-07-07 gap
// where base tsconfigs' src-only `include` left these assertions dead in
// every gate — that gap is closed.)
// ─────────────────────────────────────────────────────────────

// Positive: every KEEP-public type is reachable from '@upup/core'. One line
// per symbol in the reviewed audit/tmp/p18-sets.json `keepPublic.types` set
// (74 symbols) -- if a future edit accidentally drops one from the barrel,
// this fails to compile (per the manual-tsc caveat above).
// eslint-disable @typescript-eslint/no-unused-vars
type _Check_AcceptPreset = core.AcceptPreset
type _Check_AcceptPresetDefinition = core.AcceptPresetDefinition
type _Check_BoxConfig = core.BoxConfig
type _Check_CloudDrivesConfig = core.CloudDrivesConfig
type _Check_CoreOptions = core.CoreOptions
type _Check_CrashRecoveryOptions = core.CrashRecoveryOptions
type _Check_DriveBrowserError = core.DriveBrowserError
type _Check_DriveEventMap = core.DriveEventMap
type _Check_DriveFile = core.DriveFile
type _Check_DriveFolder = core.DriveFolder
type _Check_DriveListPage = core.DriveListPage
type _Check_DrivePlugin = core.DrivePlugin
type _Check_DriveState = core.DriveState
type _Check_DriveUser = core.DriveUser
type _Check_DropboxConfig = core.DropboxConfig
type _Check_ExtensionMethods = core.ExtensionMethods
type _Check_FileProgress = core.FileProgress
type _Check_FileTypeIconName = core.FileTypeIconName
type _Check_FileUploadResult = core.FileUploadResult
type _Check_FilesProgressMap = core.FilesProgressMap
type _Check_GoogleDriveConfig = core.GoogleDriveConfig
type _Check_IconDef = core.IconDef
type _Check_IconName = core.IconName
type _Check_ImageCompressionOptions = core.ImageCompressionOptions
type _Check_ImageEditorOptions = core.ImageEditorOptions
type _Check_LocaleBundle = core.LocaleBundle
type _Check_LocaleMeta = core.LocaleMeta
type _Check_MaxFileSizeObject = core.MaxFileSizeObject
type _Check_MultipartAbortResponse = core.MultipartAbortResponse
type _Check_MultipartCompleteResponse = core.MultipartCompleteResponse
type _Check_MultipartInitResponse = core.MultipartInitResponse
type _Check_MultipartListPartsResponse = core.MultipartListPartsResponse
type _Check_MultipartPart = core.MultipartPart
type _Check_MultipartSignPartResponse = core.MultipartSignPartResponse
type _Check_ObservableController = core.ObservableController
type _Check_OneDriveConfig = core.OneDriveConfig
type _Check_PartialMessages = core.PartialMessages
type _Check_PipelineContext = core.PipelineContext
type _Check_PipelineStep = core.PipelineStep
type _Check_PopupOAuthSpec = core.PopupOAuthSpec
type _Check_PresignedUrlResponse = core.PresignedUrlResponse
type _Check_RegisteredLocaleCode = core.RegisteredLocaleCode
type _Check_ResolvedImageEditorOptions = core.ResolvedImageEditorOptions
type _Check_RestrictionFailedReason = core.RestrictionFailedReason
type _Check_ResumableUploadOptions = core.ResumableUploadOptions
type _Check_ServerDriveFile = core.ServerDriveFile
type _Check_ServerDriveListState = core.ServerDriveListState
type _Check_ServerModeProvider = core.ServerModeProvider
type _Check_ThumbnailGeneratorOptions = core.ThumbnailGeneratorOptions
type _Check_Translations = core.Translations
type _Check_Translator = core.Translator
type _Check_TranslatorOptions = core.TranslatorOptions
type _Check_UiTranslations = core.UiTranslations
type _Check_UploadFile = core.UploadFile
type _Check_UploadFileMetadata = core.UploadFileMetadata
type _Check_UploadFileWithProgress = core.UploadFileWithProgress
type _Check_UploadOptions = core.UploadOptions
type _Check_UploadProvider = core.UploadProvider
type _Check_UploadSource = core.UploadSource
type _Check_UploaderBaseProps = core.UploaderBaseProps
type _Check_UpupColorTokens = core.UpupColorTokens
type _Check_UpupCorsConfig = core.UpupCorsConfig
type _Check_UpupLocaleCode = core.UpupLocaleCode
type _Check_UpupMessages = core.UpupMessages
type _Check_UpupPlugin = core.UpupPlugin
type _Check_UpupRadiusTokens = core.UpupRadiusTokens
type _Check_UpupShadowTokens = core.UpupShadowTokens
type _Check_UpupSlotPath = core.UpupSlotPath
type _Check_UpupSpacingTokens = core.UpupSpacingTokens
type _Check_UpupThemeConfig = core.UpupThemeConfig
type _Check_UpupThemeMode = core.UpupThemeMode
type _Check_UpupThemeSlots = core.UpupThemeSlots
type _Check_UpupThemeTokens = core.UpupThemeTokens
type _Check_ValidationResult = core.ValidationResult

// Negative: a representative sample of MOVE-internal types must NOT be
// reachable from '@upup/core' any more -- each line below should fail to
// compile without the `@ts-expect-error`, proving the curation actually cut
// them from the public barrel (not just that Phase D happened to leave them
// out by coincidence). NOTE per the plan's own B1 wording, `CoreEvents` was
// expected to stay public -- but §2.2's own tier-2 enumeration explicitly
// lists `CoreEvents` as internal, and it has no public construction surface
// that needs it by name (a consumer calls `core.on(name, handler)`; the
// handler signature is inferred from UpupCore's own binding, not from an
// imported `CoreEvents` type). Resolved in favor of the explicit tier-2
// listing -- CoreEvents is internal. See audit/fixes/P18-report.md.
// @ts-expect-error: FileManager is internal (moved to @upup/core/internal)
type _NotPublic_FileManager = core.FileManager
// @ts-expect-error: UploadManager is internal
type _NotPublic_UploadManager = core.UploadManager
// @ts-expect-error: CoreEvents is internal (see note above)
type _NotPublic_CoreEvents = core.CoreEvents
// @ts-expect-error: BaseContextUpload (context-shapes) is internal
type _NotPublic_BaseContextUpload = core.BaseContextUpload
// @ts-expect-error: OrchestratorState is internal
type _NotPublic_OrchestratorState = core.OrchestratorState

// Positive: the moved symbols above ARE reachable via '@upup/core/internal'
// -- proves the seam isn't accidentally emptied (companion to
// internal-surface.test.ts's runtime check).
type _Internal_FileManager = coreInternal.FileManager
type _Internal_CoreEvents = coreInternal.CoreEvents
type _Internal_BaseContextUpload = coreInternal.BaseContextUpload
type _Internal_OrchestratorState = coreInternal.OrchestratorState

describe('@upup/core public API surface (pin test)', () => {
    it('runtime value export list matches the curated, checked-in list', () => {
        // The curated public surface (D2), updated in pass 2: the legacy
        // parallel UploadError/UploadErrorType family was deleted (F-724) —
        // the UpupError taxonomy + uploadErrorFromResponse (via ./internal)
        // are the one error surface. 51 entries.
        const EXPECTED_PUBLIC_VALUE_EXPORTS: string[] = [
            'ACCEPT_PRESETS',
            'BOX_DESCRIPTOR',
            'BoxPlugin',
            'DROPBOX_DESCRIPTOR',
            'DropboxPlugin',
            'FILE_TYPE_EXTENSIONS',
            'FileSource',
            'GOOGLE_DRIVE_DESCRIPTOR',
            'GoogleDrivePlugin',
            'ICONS',
            'LOCALE_CODES',
            'LOCALE_META',
            'LOCALE_REGISTRY',
            'NON_S3_STORAGE_PROVIDERS',
            'ONE_DRIVE_DESCRIPTOR',
            'OneDrivePlugin',
            'PopupOAuthPlugin',
            'StorageProvider',
            'UPUP_VAR_PREFIX',
            'UploadStatus',
            'UpupAuthError',
            'UpupConfigError',
            'UpupCore',
            'UpupError',
            'UpupErrorCode',
            'UpupNetworkError',
            'UpupQuotaError',
            'UpupStorageError',
            'UpupValidationError',
            'arSA',
            'createTranslator',
            'darkPreset',
            'deDE',
            'enUS',
            'errorCodeToMessageKey',
            'esES',
            'fileTypeIconName',
            'flattenSlotsToClassNames',
            'flattenTranslatorToUiTranslations',
            'formatUiMessage',
            'frFR',
            'jaJP',
            'koKR',
            'lightPreset',
            'normalizeBcp47',
            'pluralUiMessage',
            'resolveAccept',
            'resolveTheme',
            'tokensToVars',
            'zhCN',
            'zhTW',
        ]
        const actual = Object.keys(core).sort()
        expect(actual).toEqual(EXPECTED_PUBLIC_VALUE_EXPORTS)
    })

    it('the 11-name app-level oracle survives untouched (worst-case tripwire, §7)', () => {
        // enUS...zhTW, LocaleBundle (type, not asserted at runtime), ACCEPT_PRESETS.
        // If any of these ever fails to resolve, the KEEP set is wrong -- STOP,
        // don't patch around it (per the plan's §7 tripwire).
        const ORACLE_VALUE_NAMES = [
            'enUS',
            'arSA',
            'deDE',
            'esES',
            'frFR',
            'jaJP',
            'koKR',
            'zhCN',
            'zhTW',
            'ACCEPT_PRESETS',
        ]
        for (const name of ORACLE_VALUE_NAMES) {
            expect(core).toHaveProperty(name)
        }
    })
})
