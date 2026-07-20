import type { RegisteredLocaleCode } from './locales/registry'

/**
 * Supported BCP 47 locale codes. Derived from the locale registry
 * (packages/core/src/i18n/locales/registry.ts) — registering a new locale
 * there automatically extends this union.
 */
export type UpupLocaleCode = RegisteredLocaleCode | (string & {}) // allow custom locales while keeping autocomplete

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

export interface SourceMessages {
    myDevice: string
    googleDrive: string
    oneDrive: string
    dropbox: string
    box: string
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
    /** Heading lead-in before the inline "browse files" link. */
    dropFilesHere: string
    /** Heading tail after "browse files", introducing the source chips. */
    orImportFrom: string
    selectAFolder: string
    /** ICU: "{count, plural, one {# file max} other {# files max}}" */
    filesMax: string
    /** ICU: "{size} {unit} each" — per-file size limit caption. */
    sizeEach: string
    /** ICU: "Max {size} {unit} {count, plural, one {file is allowed} other {files are allowed}}" */
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
    /** Drag-over prompt shown while a file is dragged over the panel. */
    dropToUpload: string
}

export interface HeaderMessages {
    removeAllFiles: string
    addingMoreFiles: string
    /** Navigation "Back" — closes the add-more source overlay. */
    overlayBack: string
    /** ICU: "{count, plural, one {# file selected} other {# files selected}}" */
    filesSelected: string
    addMore: string
    switchToListView: string
    switchToGridView: string
    /** Short label shown next to the icon on the ACTIVE view-toggle segment
     *  (the inactive segment stays icon-only). Keep it to one short word. */
    viewGrid: string
    viewList: string
}

export interface FileListMessages {
    /** ICU: "Upload {count, plural, one {# file} other {# files}}" */
    uploadFiles: string
    resumeUpload: string
    pauseUpload: string
    retryUpload: string
    paused: string
    uploadProgress: string
    /** SR live-region announcement when an upload begins */
    announceUploadStarted: string
    /** SR live-region announcement when an upload completes successfully */
    announceUploadComplete: string
    /** SR live-region announcement when an upload fails */
    announceUploadFailed: string
}

export interface FilePreviewMessages {
    removeFile: string
    renameFile: string
    clickToPreview: string
    editImage: string
    closeEditor: string
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
    /** ICU: "Couldn't load files: {message}" */
    loadError: string
    loadMore: string
    /** ICU: "We can't add files to your {provider}" — read-only drive-picker drop rejection. */
    dropRejected: string
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
    /** ICU: "Invalid uploadEndpoint URL: {uploadEndpoint} {error}" */
    invalidUploadEndpoint: string
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
    /** ICU: "Min {size} {unit} {count, plural, one {file is required} other {files are required}}" */
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
    boxClientIdMissing: string
    boxAuthFailed: string
    boxSessionExpired: string
    boxNoAccessToken: string
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
    sources: SourceMessages
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
    [
        NS in keyof UpupMessages
    ]: `${NS & string}.${keyof UpupMessages[NS] & string}`
}[keyof UpupMessages]

/**
 * Deep partial override type for user-provided translation patches.
 */
export type PartialMessages = {
    [NS in keyof UpupMessages]?: Partial<UpupMessages[NS]>
}

// ── Translator ───────────────────────────────────────────────

/**
 * The translator function returned by `createTranslator()`.
 * Call as `t('namespace.key', { values })` to format a message.
 */
export interface Translator {
    (key: FlatMessageKey, values?: Record<string, unknown>): string
    /** Current BCP 47 locale code */
    readonly locale: string
    /** Text direction for the current locale */
    readonly dir: 'ltr' | 'rtl'
    /** Switch locale at runtime (only available if loadLocale was provided) */
    setLocale?: ((code: string) => Promise<void>) | undefined
}
