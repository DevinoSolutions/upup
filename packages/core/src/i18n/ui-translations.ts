import type { Translator } from './types'

/**
 * Flat UI messages consumed by the React renderer.
 *
 * Core owns this adapter because the message catalog and ICU translator live in
 * core. React should render these resolved labels, not maintain a parallel i18n
 * runtime.
 */
export type UiTranslations = {
    cancel: string
    done: string
    loading: string
    myDevice: string
    googleDrive: string
    oneDrive: string
    dropbox: string
    box: string
    link: string
    camera: string
    audio: string
    screenCapture: string
    dragFileOr: string
    dragFilesOr: string
    browseFiles: string
    or: string
    selectAFolder: string
    maxFileSizeAllowed_one: string
    maxFileSizeAllowed_other: string
    addDocumentsHere: string
    builtBy: string
    removeAllFiles: string
    addingMoreFiles: string
    filesSelected_one: string
    filesSelected_other: string
    addMore: string
    switchToListView: string
    switchToGridView: string
    dropzoneLabel: string
    uploadFiles_one: string
    uploadFiles_other: string
    resumeUpload: string
    retryUpload: string
    pauseUpload: string
    paused: string
    uploadProgress: string
    removeFile: string
    clickToPreview: string
    editImage: string
    closeEditor: string
    zeroBytes: string
    bytes: string
    kb: string
    mb: string
    gb: string
    tb: string
    previewError: string
    noAcceptedFilesFound: string
    selectThisFolder: string
    addFiles_one: string
    addFiles_other: string
    logOut: string
    search: string
    authenticatePrompt: string
    signInWith: string
    enterFileUrl: string
    fetch: string
    capture: string
    switchToCamera: string
    addImage: string
    front: string
    back: string
    poweredBy: string
    multipleFilesNotAllowed: string
    failedToGetUploadUrl: string
    statusError: string
    networkErrorDuringUpload: string
    missingRequiredConfiguration: string
    invalidProvider: string
    invalidUploadEndpoint: string
    maxFileSizeMustBeGreater: string
    invalidAcceptFormat: string
    unauthorizedAccess: string
    presignedUrlInvalid: string
    temporaryCredentialsInvalid: string
    corsMisconfigured: string
    fileTooLarge: string
    invalidFileType: string
    storageQuotaExceeded: string
    signedUrlGenerationFailed: string
    uploadFailedWithCode: string
    uploadFailed: string
    dropboxSessionExpired: string
    dropboxMissingPermissions: string
    failedToRefreshExpiredToken: string
    allowedLimitSurpassed: string
    fileUnsupportedType: string
    fileTooLargeName: string
    fileTooSmallName: string
    filePreviouslySelected: string
    fileWithUrlPreviouslySelected: string
    errorCompressingFile: string
    clientIdRequired: string
    popupBlocked: string
    dropboxClientIdMissing: string
    dropboxAuthFailed: string
    boxClientIdMissing: string
    boxAuthFailed: string
    boxSessionExpired: string
    boxNoAccessToken: string
    genericErrorDetails: string
    errorProcessingFiles: string
    errorSelectingFolder: string
    graphClientNotInitialized: string
    dropboxNoAccessToken: string
    silentTokenAcquisitionFailed: string
    msalInitializationFailed: string
    silentTokenAcquisitionProceeding: string
    signInFailed: string
    handleSignInFailed: string
    signOutFailed: string
}

/** Compatibility alias for older internal names. */
export type Translations = UiTranslations

export function formatUiMessage(
    template: string,
    values?: Record<string, string | number>,
): string {
    if (!values) return template
    return template.replace(/\{\{(\w+)\}\}/g, (_, key: string) =>
        String(values[key] ?? `{{${key}}}`),
    )
}

export function pluralUiMessage(
    translations: UiTranslations,
    baseKey: string,
    count: number,
): string {
    const suffix = count === 1 ? '_one' : '_other'
    const key = `${baseKey}${suffix}` as keyof UiTranslations
    return translations[key] ?? translations[baseKey as keyof UiTranslations] ?? ''
}

export function flattenTranslatorToUiTranslations(
    translator: Translator,
): UiTranslations {
    const tr = (key: Parameters<Translator>[0], values?: Record<string, unknown>) =>
        translator(key, values)

    // Count-based ICU plurals use `#`, which bakes the number in when the form
    // is pre-evaluated. Render the "other" form with a sample count, then swap
    // the rendered digits back to a `{{count}}` placeholder so the renderer can
    // interpolate the real count at runtime (same convention as the
    // `{{size}}` / `{{unit}}` placeholders below). `\p{Nd}` covers non-Latin
    // digit scripts; count: 2 is small enough to never trigger grouping
    // separators, so the first digit run is always exactly the count.
    const countPluralOther = (key: Parameters<Translator>[0]) =>
        tr(key, { count: 2 }).replace(/\p{Nd}+/u, '{{count}}')

    return {
        cancel: tr('common.cancel'),
        done: tr('common.done'),
        loading: tr('common.loading'),
        or: tr('common.or'),
        myDevice: tr('adapters.myDevice'),
        googleDrive: tr('adapters.googleDrive'),
        oneDrive: tr('adapters.oneDrive'),
        dropbox: tr('adapters.dropbox'),
        box: tr('adapters.box'),
        link: tr('adapters.link'),
        camera: tr('adapters.camera'),
        audio: tr('adapters.audio'),
        screenCapture: tr('adapters.screenCapture'),
        dragFileOr: tr('dropzone.dragFilesOr', { count: 1 }),
        dragFilesOr: tr('dropzone.dragFilesOr', { count: 2 }),
        browseFiles: tr('dropzone.browseFiles'),
        selectAFolder: tr('dropzone.selectAFolder'),
        maxFileSizeAllowed_one: tr('dropzone.maxFileSizeAllowed', {
            size: '{{size}}',
            unit: '{{unit}}',
            count: 1,
        }),
        maxFileSizeAllowed_other: tr('dropzone.maxFileSizeAllowed', {
            size: '{{size}}',
            unit: '{{unit}}',
            count: 2,
        }),
        addDocumentsHere: tr('dropzone.addDocumentsHere', { limit: '{{limit}}' }),
        removeAllFiles: tr('header.removeAllFiles'),
        addingMoreFiles: tr('header.addingMoreFiles'),
        filesSelected_one: tr('header.filesSelected', { count: 1 }),
        filesSelected_other: countPluralOther('header.filesSelected'),
        addMore: tr('header.addMore'),
        switchToListView: tr('header.switchToListView'),
        switchToGridView: tr('header.switchToGridView'),
        dropzoneLabel: tr('dropzone.dropAriaLabel'),
        uploadFiles_one: tr('fileList.uploadFiles', { count: 1 }),
        uploadFiles_other: countPluralOther('fileList.uploadFiles'),
        resumeUpload: tr('fileList.resumeUpload'),
        retryUpload: tr('fileList.retryUpload'),
        pauseUpload: tr('fileList.pauseUpload'),
        paused: tr('fileList.paused'),
        uploadProgress: tr('fileList.uploadProgress'),
        removeFile: tr('filePreview.removeFile'),
        clickToPreview: tr('filePreview.clickToPreview'),
        editImage: tr('filePreview.editImage'),
        closeEditor: tr('filePreview.closeEditor'),
        zeroBytes: tr('filePreview.zeroBytes'),
        bytes: tr('filePreview.bytes'),
        kb: tr('filePreview.kb'),
        mb: tr('filePreview.mb'),
        gb: tr('filePreview.gb'),
        tb: tr('filePreview.tb'),
        previewError: tr('filePreview.previewError', { message: '{{message}}' }),
        noAcceptedFilesFound: tr('driveBrowser.noAcceptedFilesFound'),
        selectThisFolder: tr('driveBrowser.selectThisFolder'),
        addFiles_one: tr('driveBrowser.addFiles', { count: 1 }),
        addFiles_other: countPluralOther('driveBrowser.addFiles'),
        logOut: tr('driveBrowser.logOut'),
        search: tr('driveBrowser.search'),
        authenticatePrompt: tr('driveBrowser.authenticatePrompt', { provider: '{{provider}}' }),
        signInWith: tr('driveBrowser.signInWith', { provider: '{{provider}}' }),
        enterFileUrl: tr('url.enterFileUrl'),
        fetch: tr('url.fetch'),
        capture: tr('camera.capture'),
        switchToCamera: tr('camera.switchToCamera', { side: '{{side}}' }),
        addImage: tr('camera.addImage'),
        front: tr('camera.front'),
        back: tr('camera.back'),
        poweredBy: tr('branding.poweredBy'),
        builtBy: tr('branding.builtBy'),
        multipleFilesNotAllowed: tr('errors.multipleFilesNotAllowed'),
        failedToGetUploadUrl: tr('errors.failedToGetUploadUrl'),
        statusError: tr('errors.statusError', {
            status: '{{status}}',
            statusText: '{{statusText}}',
            details: '{{details}}',
        }),
        networkErrorDuringUpload: tr('errors.networkErrorDuringUpload', {
            status: '{{status}}',
            statusText: '{{statusText}}',
        }),
        missingRequiredConfiguration: tr('errors.missingRequiredConfiguration', { missing: '{{missing}}' }),
        invalidProvider: tr('errors.invalidProvider', {
            provider: '{{provider}}',
            validOptions: '{{validOptions}}',
        }),
        invalidUploadEndpoint: tr('errors.invalidUploadEndpoint', {
            uploadEndpoint: '{{uploadEndpoint}}',
            error: '{{error}}',
        }),
        maxFileSizeMustBeGreater: tr('errors.maxFileSizeMustBeGreater'),
        invalidAcceptFormat: tr('errors.invalidAcceptFormat', { accept: '{{accept}}' }),
        unauthorizedAccess: tr('errors.unauthorizedAccess'),
        presignedUrlInvalid: tr('errors.presignedUrlInvalid'),
        temporaryCredentialsInvalid: tr('errors.temporaryCredentialsInvalid'),
        corsMisconfigured: tr('errors.corsMisconfigured'),
        fileTooLarge: tr('errors.fileTooLarge'),
        invalidFileType: tr('errors.invalidFileType'),
        storageQuotaExceeded: tr('errors.storageQuotaExceeded'),
        signedUrlGenerationFailed: tr('errors.signedUrlGenerationFailed'),
        uploadFailedWithCode: tr('errors.uploadFailedWithCode', { code: '{{code}}' }),
        uploadFailed: tr('errors.uploadFailed', { message: '{{message}}' }),
        dropboxSessionExpired: tr('errors.dropboxSessionExpired'),
        dropboxMissingPermissions: tr('errors.dropboxMissingPermissions'),
        failedToRefreshExpiredToken: tr('errors.failedToRefreshExpiredToken'),
        allowedLimitSurpassed: tr('errors.allowedLimitSurpassed'),
        fileUnsupportedType: tr('errors.fileUnsupportedType', { name: '{{name}}' }),
        fileTooLargeName: tr('errors.fileTooLargeName', {
            name: '{{name}}',
            size: '{{size}}',
            unit: '{{unit}}',
        }),
        fileTooSmallName: tr('errors.fileTooSmallName', {
            name: '{{name}}',
            size: '{{size}}',
            unit: '{{unit}}',
        }),
        filePreviouslySelected: tr('errors.filePreviouslySelected', { name: '{{name}}' }),
        fileWithUrlPreviouslySelected: tr('errors.fileWithUrlPreviouslySelected', { url: '{{url}}' }),
        errorCompressingFile: tr('errors.errorCompressingFile', { name: '{{name}}' }),
        clientIdRequired: tr('errors.clientIdRequired'),
        popupBlocked: tr('errors.popupBlocked'),
        dropboxClientIdMissing: tr('errors.dropboxClientIdMissing'),
        dropboxAuthFailed: tr('errors.dropboxAuthFailed'),
        boxClientIdMissing: tr('errors.boxClientIdMissing'),
        boxAuthFailed: tr('errors.boxAuthFailed'),
        boxSessionExpired: tr('errors.boxSessionExpired'),
        boxNoAccessToken: tr('errors.boxNoAccessToken'),
        genericErrorDetails: tr('errors.genericErrorDetails', { details: '{{details}}' }),
        errorProcessingFiles: tr('errors.errorProcessingFiles', { message: '{{message}}' }),
        errorSelectingFolder: tr('errors.errorSelectingFolder', { message: '{{message}}' }),
        graphClientNotInitialized: tr('errors.graphClientNotInitialized'),
        dropboxNoAccessToken: tr('errors.dropboxNoAccessToken'),
        silentTokenAcquisitionFailed: tr('errors.silentTokenAcquisitionFailed', { details: '{{details}}' }),
        msalInitializationFailed: tr('errors.msalInitializationFailed', { details: '{{details}}' }),
        silentTokenAcquisitionProceeding: tr('errors.silentTokenAcquisitionProceeding', { details: '{{details}}' }),
        signInFailed: tr('errors.signInFailed', { message: '{{message}}' }),
        handleSignInFailed: tr('errors.handleSignInFailed', { message: '{{message}}' }),
        signOutFailed: tr('errors.signOutFailed', { message: '{{message}}' }),
    }
}
