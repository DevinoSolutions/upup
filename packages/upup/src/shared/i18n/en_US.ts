import type { Translations } from './types'

export const en_US: Translations = {
    // ── General ───────────────────────────────────────────────
    cancel: 'Cancel',
    done: 'Done',
    loading: 'Loading...',

    // ── Adapter names ─────────────────────────────────────────
    myDevice: 'My Device',
    googleDrive: 'Google Drive',
    oneDrive: 'OneDrive',
    dropbox: 'Dropbox',
    link: 'Link',
    camera: 'Camera',

    // ── Drop-zone / AdapterSelector ───────────────────────────
    dragFileOr: 'Drag your file or',
    dragFilesOr: 'Drag your files or',
    browseFiles: 'browse files',
    or: 'or',
    selectAFolder: 'select a folder',
    maxFileSizeAllowed_one: 'Max {{size}} {{unit}} file is allowed',
    maxFileSizeAllowed_other: 'Max {{size}} {{unit}} files are allowed',

    // ── UpupUploader (root) ───────────────────────────────────
    addDocumentsHere:
        'Add your documents here, you can upload up to {{limit}} files max',
    builtBy: 'Built by',

    // ── MainBoxHeader ─────────────────────────────────────────
    removeAllFiles: 'Remove all files',
    addingMoreFiles: 'Adding more files',
    filesSelected_one: '{{count}} file selected',
    filesSelected_other: '{{count}} files selected',
    addMore: 'Add More',

    // ── FileList ──────────────────────────────────────────────
    uploadFiles_one: 'Upload {{count}} file',
    uploadFiles_other: 'Upload {{count}} files',

    // ── FilePreview ───────────────────────────────────────────
    removeFile: 'Remove file',
    clickToPreview: 'Click to preview',
    zeroBytes: '0 Byte',
    bytes: 'Bytes',
    kb: 'KB',
    mb: 'MB',
    gb: 'GB',
    tb: 'TB',

    // ── FilePreviewPortal / Thumbnail ─────────────────────────
    previewError: 'Error: {{message}}',

    // ── DriveBrowser ──────────────────────────────────────────
    noAcceptedFilesFound: 'No accepted files found',
    selectThisFolder: 'Select this folder',
    addFiles_one: 'Add {{count}} file',
    addFiles_other: 'Add {{count}} files',

    // ── DriveBrowserHeader ────────────────────────────────────
    logOut: 'Log out',
    search: 'Search',

    // ── UrlUploader ───────────────────────────────────────────
    enterFileUrl: 'Enter file url',
    fetch: 'Fetch',

    // ── CameraUploader ────────────────────────────────────────
    capture: 'Capture',
    switchToCamera: 'switch to {{side}}',
    addImage: 'Add Image',

    // ── Camera sides ──────────────────────────────────────────
    front: 'front',
    back: 'back',

    // ── Powered by ────────────────────────────────────────────
    poweredBy: 'Powered by',

    // ── Errors & Warnings ───────────────────────────────────
    multipleFilesNotAllowed: 'Multiple file uploads are not allowed',
    failedToGetUploadUrl: 'Failed to get upload URL',
    statusError: 'Status: {{status}} ({{statusText}}). Details: {{details}}',
    networkErrorDuringUpload:
        'Network error during upload - Status: {{status}} ({{statusText}})',
    missingRequiredConfiguration: 'Missing required configuration: {{missing}}',
    invalidProvider:
        'Invalid provider: {{provider}}. Valid options: {{validOptions}}',
    invalidTokenEndpoint:
        'Invalid tokenEndpoint URL: {{tokenEndpoint}} {{error}}',
    maxFileSizeMustBeGreater: 'maxFileSize must be greater than 0',
    invalidAcceptFormat:
        'Invalid accept format: {{accept}}. Use MIME types, */*, * or extensions (like .fbx)',

    unauthorizedAccess: 'Unauthorized access to Provider',
    presignedUrlInvalid: 'Presigned URL has expired or is invalid',
    temporaryCredentialsInvalid: 'Temporary credentials are no longer valid',
    corsMisconfigured: 'CORS configuration prevents file upload',
    fileTooLarge: 'File exceeds maximum size limit',
    invalidFileType: 'File type is not allowed',
    storageQuotaExceeded: 'Storage quota has been exceeded',
    signedUrlGenerationFailed: 'Failed to generate signed upload URL',
    uploadFailedWithCode: 'Upload failed with error code: {{code}}',
    uploadFailed: 'Upload failed: {{message}}',

    // Dropbox-specific
    dropboxSessionExpired:
        'Your Dropbox session has expired. Please re-authenticate to continue.',
    dropboxMissingPermissions:
        'Your Dropbox app is missing required permissions. Please add the following scopes in the Dropbox Developer Console: files.metadata.read, account_info.read',
    failedToRefreshExpiredToken: 'Failed to refresh expired token',

    // Upup UI messages
    allowedLimitSurpassed: 'Allowed limit has been surpassed!',
    fileUnsupportedType: '{{name}} has an unsupported type!',
    fileTooLargeName: '{{name}} is larger than {{size}} {{unit}}!',
    filePreviouslySelected: '{{name}} has previously been selected',
    fileWithUrlPreviouslySelected:
        'A file with this url: {{url}} has previously been selected',
    errorCompressingFile: 'Error compressing {{name}}',

    // Integration / Auth errors
    clientIdRequired: 'Client ID is required...',
    popupBlocked: 'Popup blocked',
    dropboxClientIdMissing: 'Dropbox clientId missing',
    dropboxAuthFailed: 'Dropbox authentication failed',
    genericErrorDetails: 'Error: {{details}}',
    errorProcessingFiles: 'Error processing files: {{message}}',
    errorSelectingFolder: 'Error selecting folder: {{message}}',
    graphClientNotInitialized: 'Graph client not initialized',
    dropboxNoAccessToken: 'No access token provided for Dropbox download',

    // MSAL / OneDrive messages
    silentTokenAcquisitionFailed:
        'Silent token acquisition failed: {{details}}',
    msalInitializationFailed: 'MSAL initialization failed: {{details}}',
    silentTokenAcquisitionProceeding:
        'Silent token acquisition failed, proceeding with interactive login{{details}}',
    signInFailed: 'Sign-in failed: {{message}}',
    handleSignInFailed: 'Handle sign-in failed: {{message}}',
    signOutFailed: 'Sign-out failed: {{message}}',
}
