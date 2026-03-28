import type { Translations } from '../types'

export const de_DE: Translations = {
    cancel: 'Abbrechen',
    done: 'Fertig',
    loading: 'Laden...',

    myDevice: 'Mein Gerät',
    googleDrive: 'Google Drive',
    oneDrive: 'OneDrive',
    dropbox: 'Dropbox',
    link: 'Link',
    camera: 'Kamera',
    audio: 'Audio',
    screenCapture: 'Bildschirmaufnahme',

    dragFileOr: 'Datei hierher ziehen oder',
    dragFilesOr: 'Dateien hierher ziehen oder',
    dragFileHere: 'Datei hierher ziehen',
    dragFilesHere: 'Dateien hierher ziehen',
    browseFiles: 'Dateien durchsuchen',
    or: 'oder',
    selectAFolder: 'Ordner auswählen',
    maxFileSizeAllowed_one: 'Maximal {{size}} {{unit}} pro Datei erlaubt',
    minFileSizeDisplay: 'Min. {{size}} {{unit}}',
    allowedFileTypes: 'Erlaubte Typen: {{types}}',
    maxFileCount_one: 'Bis zu {{limit}} Datei',
    maxFileCount_other: 'Bis zu {{limit}} Dateien',
    minFileCount_one: 'Mindestens {{limit}} Datei erforderlich',
    minFileCount_other: 'Mindestens {{limit}} Dateien erforderlich',
    totalFileSizeExceeded: 'Gesamtdateigröße überschreitet das Maximum von {{size}} {{unit}}',
    maxTotalFileSizeDisplay: 'Maximale Gesamtgröße: {{size}} {{unit}}',
    maxFileSizeAllowed_other: 'Maximal {{size}} {{unit}} pro Datei erlaubt',

    addDocumentsHere: 'Dokumente hier hinzufügen, maximal {{limit}} Dateien',
    builtBy: 'Entwickelt von',

    removeAllFiles: 'Alle Dateien entfernen',
    addingMoreFiles: 'Weitere Dateien hinzufügen',
    filesSelected_one: '{{count}} Datei ausgewählt',
    filesSelected_other: '{{count}} Dateien ausgewählt',
    addMore: 'Mehr hinzufügen',

    uploadFiles_one: '{{count}} Datei hochladen',
    uploadFiles_other: '{{count}} Dateien hochladen',

    removeFile: 'Datei entfernen',
    renameFile: 'Klicken zum Umbenennen',
    clickToPreview: 'Vorschau anzeigen',
    zeroBytes: '0 Byte',
    bytes: 'Bytes',
    kb: 'KB',
    mb: 'MB',
    gb: 'GB',
    tb: 'TB',

    previewError: 'Fehler: {{message}}',

    noAcceptedFilesFound: 'Keine akzeptierten Dateien gefunden',
    selectThisFolder: 'Diesen Ordner auswählen',
    addFiles_one: '{{count}} Datei hinzufügen',
    addFiles_other: '{{count}} Dateien hinzufügen',

    logOut: 'Abmelden',
    search: 'Suchen',

    enterFileUrl: 'Datei-URL eingeben',
    fetch: 'Abrufen',

    capture: 'Aufnehmen',
    switchToCamera: 'Zur {{side}}kamera wechseln',
    addImage: 'Bild hinzufügen',
    photo: 'Foto',
    video: 'Video',
    startVideoRecording: 'Aufnehmen',
    stopVideoRecording: 'Stopp',
    cameraRecording: 'Aufnahme...',
    addVideo: 'Video hinzufügen',
    mirrorCamera: 'Spiegeln',

    front: 'Front',
    back: 'Rück',

    // ── AudioUploader ─────────────────────────────────────────
    startRecording: 'Aufnahme starten',
    stopRecording: 'Aufnahme stoppen',
    recording: 'Aufnahme...',
    addAudio: 'Audio hinzufügen',
    deleteRecording: 'Aufnahme löschen',

    // ── ScreenCaptureUploader ─────────────────────────────────
    startScreenCapture: 'Bildschirmaufnahme starten',
    stopScreenCapture: 'Aufnahme stoppen',
    screenRecording: 'Bildschirmaufnahme...',
    addScreenCapture: 'Bildschirmaufnahme hinzufügen',
    deleteScreenCapture: 'Aufnahme löschen',

    poweredBy: 'Bereitgestellt von',
    multipleFilesNotAllowed: 'Mehrere Dateien dürfen nicht hochgeladen werden',
    failedToGetUploadUrl: 'Fehler beim Abrufen der Upload-URL',
    statusError: 'Status: {{status}} ({{statusText}}). Details: {{details}}',
    networkErrorDuringUpload:
        'Netzwerkfehler während des Uploads - Status: {{status}} ({{statusText}})',
    missingRequiredConfiguration:
        'Fehlende erforderliche Konfiguration: {{missing}}',
    invalidProvider:
        'Ungültiger Anbieter: {{provider}}. Gültige Optionen: {{validOptions}}',
    invalidTokenEndpoint:
        'Ungültige tokenEndpoint-URL: {{tokenEndpoint}} {{error}}',
    maxFileSizeMustBeGreater: 'maxFileSize muss größer als 0 sein',
    invalidAcceptFormat:
        'Ungültiges Accept-Format: {{accept}}. Verwenden Sie MIME-Typen, */*, * oder Erweiterungen (z. B. .fbx)',

    unauthorizedAccess: 'Unbefugter Zugriff auf den Anbieter',
    presignedUrlInvalid: 'Die Presigned-URL ist abgelaufen oder ungültig',
    temporaryCredentialsInvalid:
        'Temporäre Anmeldeinformationen sind nicht mehr gültig',
    corsMisconfigured: 'CORS-Konfiguration verhindert den Datei-Upload',
    fileTooLarge: 'Datei überschreitet die maximale Größenbegrenzung',
    invalidFileType: 'Dateityp ist nicht erlaubt',
    storageQuotaExceeded: 'Speicherplatzkontingent wurde überschritten',
    signedUrlGenerationFailed:
        'Erstellung der signierten Upload-URL fehlgeschlagen',
    uploadFailedWithCode: 'Upload fehlgeschlagen mit Fehlercode: {{code}}',
    uploadFailed: 'Upload fehlgeschlagen: {{message}}',

    // Dropbox-specific
    dropboxSessionExpired:
        'Ihre Dropbox-Sitzung ist abgelaufen. Bitte authentifizieren Sie sich erneut, um fortzufahren.',
    dropboxMissingPermissions:
        'Ihre Dropbox-App hat nicht die benötigten Berechtigungen. Fügen Sie bitte folgende Scopes in der Dropbox Developer Console hinzu: files.metadata.read, account_info.read',
    failedToRefreshExpiredToken:
        'Aktualisierung des abgelaufenen Tokens fehlgeschlagen',

    // Upup UI messages
    allowedLimitSurpassed: 'Erlaubtes Limit überschritten!',
    fileUnsupportedType: '{{name}} hat einen nicht unterstützten Typ!',
    fileTooLargeName: '{{name}} ist größer als {{size}} {{unit}}!',
    fileTooSmallName: '{{name}} ist kleiner als {{size}} {{unit}}!',
    minFileSizeAllowed_one: 'Min. {{size}} {{unit}} Datei erforderlich',
    minFileSizeAllowed_other: 'Min. {{size}} {{unit}} Dateien erforderlich',
    minFileSizeMustBeGreater: 'minFileSize muss größer als 0 sein',
    filePreviouslySelected: '{{name}} wurde bereits ausgewählt',
    fileWithUrlPreviouslySelected:
        'Eine Datei mit dieser URL: {{url}} wurde bereits ausgewählt',
    errorCompressingFile: 'Fehler beim Komprimieren von {{name}}',
    errorCompressingImage: 'Fehler beim Komprimieren des Bildes {{name}}',
    generatingThumbnails: 'Miniaturbilder werden erstellt...',

    // Integration / Auth errors
    clientIdRequired: 'Client-ID ist erforderlich...',
    popupBlocked: 'Popup blockiert',
    dropboxClientIdMissing: 'Dropbox-Client-ID fehlt',
    dropboxAuthFailed: 'Dropbox-Authentifizierung fehlgeschlagen',
    genericErrorDetails: 'Fehler: {{details}}',
    errorProcessingFiles: 'Fehler beim Verarbeiten der Dateien: {{message}}',
    errorSelectingFolder: 'Fehler beim Auswählen des Ordners: {{message}}',
    graphClientNotInitialized: 'Graph-Client nicht initialisiert',
    dropboxNoAccessToken: 'Kein Zugriffstoken für Dropbox-Download vorhanden',

    // MSAL / OneDrive messages
    silentTokenAcquisitionFailed:
        'Stilles Token-Abrufen fehlgeschlagen: {{details}}',
    msalInitializationFailed:
        'MSAL-Initialisierung fehlgeschlagen: {{details}}',
    silentTokenAcquisitionProceeding:
        'Stilles Token-Abrufen fehlgeschlagen, fahre mit interaktivem Login fort{{details}}',
    signInFailed: 'Anmeldung fehlgeschlagen: {{message}}',
    handleSignInFailed: 'Fehler beim Verarbeiten der Anmeldung: {{message}}',
    signOutFailed: 'Abmeldung fehlgeschlagen: {{message}}',
}
