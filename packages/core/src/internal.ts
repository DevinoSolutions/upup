// @upupjs/core/internal — the explicit deep-import surface for implementation
// details the sibling framework packages (@upupjs/react/vue/svelte/angular/
// vanilla) consume to build their UIs, but that a library consumer building
// against the curated `@upupjs/core` public barrel should not depend on.
//
// A symbol lands here, not in `./index.ts`, when it is part of the engine's
// own machinery (state managers, controllers, the orchestrator, low-level
// utils, session storage) rather than part of the surface a consumer is
// meant to construct or handle. See CLAUDE.md's "Package map" entry for the
// convention and packages/core/tests/internal-surface.test.ts for the pin.

// ── Engine collaborators ──────────────────────────────────────
export { EventEmitter } from './events'
export { PluginManager } from './plugin'
export { FileManager } from './file-manager'
export { PipelineEngine } from './pipeline/engine'
export { DirectUpload } from './strategies/direct-upload'
export { TokenEndpointCredentials } from './strategies/token-endpoint'
export { BrowserRuntime } from './runtime/browser'
export { UploadManager } from './upload-manager'
export { CrashRecoveryManager, IndexedDBStorage } from './crash-recovery'
export type { PersistentStorage } from './crash-recovery'
export { SSEProcessor } from './sse-processor'

// ── Orchestrator ───────────────────────────────────────────────
export { UploaderOrchestrator } from './orchestrator/uploader-orchestrator'
export type {
    OrchestratorState,
    OrchestratorCallbacks,
    UploadProgressInfo,
} from './orchestrator/types'
export {
    getDir,
    normalizeSource,
    DEFAULT_SOURCES,
    DEFAULT_MAX_FILE_SIZE,
} from './orchestrator/helpers'

// ── Uploader controller factory (ex `export * from './uploader'`) ──
export { normalizeUploaderOptions } from './uploader/normalize-options'
export { createUploaderController } from './uploader/create-uploader-controller'
export { createChildController } from './uploader/create-child-controller'
export type {
    UploaderControllerOptions,
    UploaderI18nOptions,
    UploaderCallbacks,
    UploaderResolved,
    NormalizedUploaderOptions,
    UploaderCommands,
    UploaderHostHooks,
    CreateUploaderControllerParams,
    UploaderController,
} from './uploader/types'
export type {
    ChildControllerLike,
    CreateChildControllerOptions,
    ChildControllerHandle,
} from './uploader/create-child-controller'

// ── Controllers ────────────────────────────────────────────────
export { DriveBrowserController } from './drives/drive-browser-controller'
export type {
    DriveBrowserState,
    DriveBrowserCallbacks,
} from './drives/drive-browser-controller'
export { DragDropController } from './controllers/drag-drop-controller'
export type {
    DragDropDeps,
    DragDropOptions,
    DragDropProps,
    DragDropSnapshot,
} from './controllers/drag-drop-controller'
export { ServerModeDriveController } from './controllers/server-mode-drive-controller'
export type {
    ServerDriveTransferResult,
    ServerDriveSnapshot,
    ServerModeDriveDeps,
} from './controllers/server-mode-drive-controller'

// ── Context shapes (BaseContext*) ─────────────────────────────
export type {
    BaseContextUpload,
    BaseContextRuntime,
    BaseContextSource,
    BaseContextI18n,
    BaseContextFiles,
    BaseContextUploadControls,
    BaseContextView,
    BaseContextEditor,
    BaseContextTheme,
} from './types/context-shapes'

// ── Contract interfaces (strategies + pipeline + events) ──────
export type {
    FileMetadata,
    UploadCredentials,
    UploadResult,
    ProgressInfo,
    CloudProvider,
    CredentialStrategy,
    UploadStrategy,
    RuntimeAdapter,
} from './contracts-strategies'
export type { CoreEvents } from './types/core-events'

// ── i18n internals ─────────────────────────────────────────────
export { buildFallbackChain, resolveMessage } from './i18n/resolve-locale'
export type { FlatMessageKey, MessageNamespace } from './i18n/types'

// ── Theme internals ────────────────────────────────────────────
export { ThemeStore } from './theme/theme-store'
export type { ThemeStoreState } from './theme/theme-store'
export { tokensToVarRefs } from './theme/vars'
export type { UpupResolvedTheme, DeepPartial } from './theme/types'
export type { DeepPartialSlots, InternalFlatClassNames } from './theme/slots'

// ── Drive internals ─────────────────────────────────────────────
export { bindDriveEvents } from './drives/bind-drive-events'
export type { DriveEventCallbacks } from './drives/bind-drive-events'
export type {
    DriveProviderDescriptor,
    DriveAuthKind,
    DriveFolderKey,
    DriveSelectFolderStrategy,
} from './drives/drive-browser-descriptors'

// ── Dropped-files + util grab-bag ──────────────────────────────
export { collectDroppedFiles } from './folder-drop'
export type { DroppedFilesResult } from './folder-drop'
export { cn } from './utils/tailwind'
export { b64EncodeUnicode } from './utils/encoder'
export { fileAppendParams, revokeFileUrl } from './utils/file-helpers'
export {
    dataURLtoBlob,
    blobToUploadFile,
    revokeAndReplace,
} from './utils/image-helpers'
export { loadGoogleIdentityServices } from './utils/load-gapi'
export { sourceNameKeys } from './utils/source-metadata'
export { isUploadActive, isUploadIdle } from './utils/status-helpers'
export {
    bytesToSize,
    sizeToBytes,
    checkFileSize,
    PREVIEW_MAX_TEXT_SIZE,
    PREVIEW_TEXT_TRUNCATE_LENGTH,
    fileGetIsImage,
    fileGetIsPdf,
    fileGetIsText,
    fileCanPreviewText,
    fileGetExtension,
    fileIs3D,
    searchDriveFiles,
} from './file-utils'

// ── Multipart-session store ────────────────────────────────────
export {
    saveSession,
    loadSession,
    removeSession,
    updateSessionProgress,
    clearAllSessions,
    fileFingerprint,
} from './utils/multipart-session-store'
export type { MultipartSession } from './utils/multipart-session-store'

// ── Fetch helpers ───────────────────────────────────────────────
export {
    MIME_EXTENSION_MAP,
    sanitizeFileName,
    extensionFromMime,
    fileNameFromContentDisposition,
    deriveFetchedFileName,
} from './utils/fetch-helpers'
