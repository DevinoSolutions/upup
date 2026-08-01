import type { Translator } from './types'

/**
 * Flat UI messages consumed by the React renderer.
 *
 * Core owns this bridge because the message catalog and ICU translator live in
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
    dropFilesHere: string
    orImportFrom: string
    or: string
    selectAFolder: string
    maxFileSizeAllowed_one: string
    maxFileSizeAllowed_other: string
    filesMax_one: string
    filesMax_other: string
    sizeEach: string
    addDocumentsHere: string
    dropToUpload: string
    builtBy: string
    removeAllFiles: string
    addingMoreFiles: string
    overlayBack: string
    filesSelected_one: string
    filesSelected_other: string
    addMore: string
    switchToListView: string
    switchToGridView: string
    viewGrid: string
    viewList: string
    dropzoneLabel: string
    uploadFiles_one: string
    uploadFiles_other: string
    resumeUpload: string
    retryUpload: string
    pauseUpload: string
    paused: string
    uploadProgress: string
    announceUploadStarted: string
    announceUploadComplete: string
    announceUploadFailed: string
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
    driveLoadError: string
    dropRejected: string
    loadMore: string
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

/**
 * Non-enumerable tag carrying the bundle's BCP 47 locale on the flattened
 * translations object (stamped once at `flattenTranslatorToUiTranslations`),
 * so `pluralUiMessage` can select the CLDR-correct plural category without
 * threading a `locale` argument through every one of its call sites.
 */
const UI_LOCALE = Symbol('upupUiLocale')

const pluralRulesCache = new Map<string, Intl.PluralRules>()

function selectPluralCategory(
    locale: string,
    count: number,
): Intl.LDMLPluralRule {
    let pr = pluralRulesCache.get(locale)
    if (!pr) {
        try {
            pr = new Intl.PluralRules(locale)
        } catch {
            // upup-catch: invalid/unsupported locale code — fall back to English plural rules
            pr = new Intl.PluralRules('en-US')
        }
        pluralRulesCache.set(locale, pr)
    }
    return pr.select(count)
}

function localeOf(translations: UiTranslations): string {
    return (
        ((translations as Record<symbol, unknown>)[UI_LOCALE] as
            string | undefined) ?? 'en-US'
    )
}

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
    locale: string = localeOf(translations),
): string {
    const category = selectPluralCategory(locale, count) // zero|one|two|few|many|other
    // The constructed keys aren't guaranteed to be real UiTranslations properties (e.g.
    // "_few" may not exist for a locale that only defines _one/_other) — index through a
    // generic dict so the type honestly reflects that a lookup can miss.
    const dict = translations as unknown as Record<string, string>
    const exact = `${baseKey}_${category}`
    const other = `${baseKey}_other`
    return dict[exact] ?? dict[other] ?? dict[baseKey] ?? ''
}

export function flattenTranslatorToUiTranslations(
    translator: Translator,
): UiTranslations {
    const tr = (
        key: Parameters<Translator>[0],
        values?: Record<string, unknown>,
    ) => translator(key, values)

    // Count-based ICU plurals use `#`, which bakes the number in when the form
    // is pre-evaluated. Render the requested form with a sample count, then
    // swap the rendered digits back to a `{{count}}` placeholder so the
    // renderer can interpolate the real count at runtime (same convention as
    // the `{{size}}` / `{{unit}}` placeholders below). `\p{Nd}` covers
    // non-Latin digit scripts; sample counts of 1/2 are small enough to
    // never trigger grouping separators, so the first digit run is always
    // exactly the count. BOTH `_one` and `_other` must be placeholder-
    // preserving (not just `_other`): once plural selection is CLDR-correct,
    // `one` can be chosen for counts other than 1 (e.g. French `one` = {0,1}),
    // so a baked-in "1" would render wrong for count 0.
    const countPluralForm = (key: Parameters<Translator>[0], count: number) =>
        tr(key, { count }).replace(/\p{Nd}+/u, '{{count}}')

    const result: UiTranslations = {
        cancel: tr('common.cancel'),
        done: tr('common.done'),
        loading: tr('common.loading'),
        or: tr('common.or'),
        myDevice: tr('sources.myDevice'),
        googleDrive: tr('sources.googleDrive'),
        oneDrive: tr('sources.oneDrive'),
        dropbox: tr('sources.dropbox'),
        box: tr('sources.box'),
        link: tr('sources.link'),
        camera: tr('sources.camera'),
        audio: tr('sources.audio'),
        screenCapture: tr('sources.screenCapture'),
        dragFileOr: tr('dropzone.dragFilesOr', { count: 1 }),
        dragFilesOr: tr('dropzone.dragFilesOr', { count: 2 }),
        browseFiles: tr('dropzone.browseFiles'),
        dropFilesHere: tr('dropzone.dropFilesHere'),
        orImportFrom: tr('dropzone.orImportFrom'),
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
        filesMax_one: countPluralForm('dropzone.filesMax', 1),
        filesMax_other: countPluralForm('dropzone.filesMax', 2),
        sizeEach: tr('dropzone.sizeEach', {
            size: '{{size}}',
            unit: '{{unit}}',
        }),
        addDocumentsHere: tr('dropzone.addDocumentsHere', {
            limit: '{{limit}}',
        }),
        dropToUpload: tr('dropzone.dropToUpload'),
        removeAllFiles: tr('header.removeAllFiles'),
        addingMoreFiles: tr('header.addingMoreFiles'),
        overlayBack: tr('header.overlayBack'),
        filesSelected_one: countPluralForm('header.filesSelected', 1),
        filesSelected_other: countPluralForm('header.filesSelected', 2),
        addMore: tr('header.addMore'),
        switchToListView: tr('header.switchToListView'),
        switchToGridView: tr('header.switchToGridView'),
        viewGrid: tr('header.viewGrid'),
        viewList: tr('header.viewList'),
        dropzoneLabel: tr('dropzone.dropAriaLabel'),
        uploadFiles_one: countPluralForm('fileList.uploadFiles', 1),
        uploadFiles_other: countPluralForm('fileList.uploadFiles', 2),
        resumeUpload: tr('fileList.resumeUpload'),
        retryUpload: tr('fileList.retryUpload'),
        pauseUpload: tr('fileList.pauseUpload'),
        paused: tr('fileList.paused'),
        uploadProgress: tr('fileList.uploadProgress'),
        announceUploadStarted: tr('fileList.announceUploadStarted'),
        announceUploadComplete: tr('fileList.announceUploadComplete'),
        announceUploadFailed: tr('fileList.announceUploadFailed'),
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
        previewError: tr('filePreview.previewError', {
            message: '{{message}}',
        }),
        noAcceptedFilesFound: tr('driveBrowser.noAcceptedFilesFound'),
        selectThisFolder: tr('driveBrowser.selectThisFolder'),
        addFiles_one: countPluralForm('driveBrowser.addFiles', 1),
        addFiles_other: countPluralForm('driveBrowser.addFiles', 2),
        logOut: tr('driveBrowser.logOut'),
        search: tr('driveBrowser.search'),
        authenticatePrompt: tr('driveBrowser.authenticatePrompt', {
            provider: '{{provider}}',
        }),
        signInWith: tr('driveBrowser.signInWith', { provider: '{{provider}}' }),
        driveLoadError: tr('driveBrowser.loadError', {
            message: '{{message}}',
        }),
        dropRejected: tr('driveBrowser.dropRejected', {
            provider: '{{provider}}',
        }),
        loadMore: tr('driveBrowser.loadMore'),
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
        missingRequiredConfiguration: tr(
            'errors.missingRequiredConfiguration',
            { missing: '{{missing}}' },
        ),
        invalidProvider: tr('errors.invalidProvider', {
            provider: '{{provider}}',
            validOptions: '{{validOptions}}',
        }),
        invalidUploadEndpoint: tr('errors.invalidUploadEndpoint', {
            uploadEndpoint: '{{uploadEndpoint}}',
            error: '{{error}}',
        }),
        maxFileSizeMustBeGreater: tr('errors.maxFileSizeMustBeGreater'),
        invalidAcceptFormat: tr('errors.invalidAcceptFormat', {
            accept: '{{accept}}',
        }),
        unauthorizedAccess: tr('errors.unauthorizedAccess'),
        presignedUrlInvalid: tr('errors.presignedUrlInvalid'),
        temporaryCredentialsInvalid: tr('errors.temporaryCredentialsInvalid'),
        corsMisconfigured: tr('errors.corsMisconfigured'),
        fileTooLarge: tr('errors.fileTooLarge'),
        invalidFileType: tr('errors.invalidFileType'),
        storageQuotaExceeded: tr('errors.storageQuotaExceeded'),
        signedUrlGenerationFailed: tr('errors.signedUrlGenerationFailed'),
        uploadFailedWithCode: tr('errors.uploadFailedWithCode', {
            code: '{{code}}',
        }),
        uploadFailed: tr('errors.uploadFailed', { message: '{{message}}' }),
        dropboxSessionExpired: tr('errors.dropboxSessionExpired'),
        dropboxMissingPermissions: tr('errors.dropboxMissingPermissions'),
        failedToRefreshExpiredToken: tr('errors.failedToRefreshExpiredToken'),
        allowedLimitSurpassed: tr('errors.allowedLimitSurpassed'),
        fileUnsupportedType: tr('errors.fileUnsupportedType', {
            name: '{{name}}',
        }),
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
        filePreviouslySelected: tr('errors.filePreviouslySelected', {
            name: '{{name}}',
        }),
        fileWithUrlPreviouslySelected: tr(
            'errors.fileWithUrlPreviouslySelected',
            { url: '{{url}}' },
        ),
        errorCompressingFile: tr('errors.errorCompressingFile', {
            name: '{{name}}',
        }),
        clientIdRequired: tr('errors.clientIdRequired'),
        popupBlocked: tr('errors.popupBlocked'),
        dropboxClientIdMissing: tr('errors.dropboxClientIdMissing'),
        dropboxAuthFailed: tr('errors.dropboxAuthFailed'),
        boxClientIdMissing: tr('errors.boxClientIdMissing'),
        boxAuthFailed: tr('errors.boxAuthFailed'),
        boxSessionExpired: tr('errors.boxSessionExpired'),
        boxNoAccessToken: tr('errors.boxNoAccessToken'),
        genericErrorDetails: tr('errors.genericErrorDetails', {
            details: '{{details}}',
        }),
        errorProcessingFiles: tr('errors.errorProcessingFiles', {
            message: '{{message}}',
        }),
        errorSelectingFolder: tr('errors.errorSelectingFolder', {
            message: '{{message}}',
        }),
        graphClientNotInitialized: tr('errors.graphClientNotInitialized'),
        dropboxNoAccessToken: tr('errors.dropboxNoAccessToken'),
        silentTokenAcquisitionFailed: tr(
            'errors.silentTokenAcquisitionFailed',
            { details: '{{details}}' },
        ),
        msalInitializationFailed: tr('errors.msalInitializationFailed', {
            details: '{{details}}',
        }),
        silentTokenAcquisitionProceeding: tr(
            'errors.silentTokenAcquisitionProceeding',
            { details: '{{details}}' },
        ),
        signInFailed: tr('errors.signInFailed', { message: '{{message}}' }),
        handleSignInFailed: tr('errors.handleSignInFailed', {
            message: '{{message}}',
        }),
        signOutFailed: tr('errors.signOutFailed', { message: '{{message}}' }),
    }

    // Stamp the bundle's locale onto the flattened object (non-enumerable —
    // stays invisible to Object.keys/JSON.stringify/spread) so pluralUiMessage
    // can select the CLDR-correct category without a threaded `locale` arg.
    return Object.defineProperty(result, UI_LOCALE, {
        value: translator.locale,
        enumerable: false,
    })
}
