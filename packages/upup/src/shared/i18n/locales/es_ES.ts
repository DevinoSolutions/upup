import type { Translations } from '../types'

export const es_ES: Translations = {
    cancel: 'Cancelar',
    done: 'Hecho',
    loading: 'Cargando...',

    myDevice: 'Mi dispositivo',
    googleDrive: 'Google Drive',
    oneDrive: 'OneDrive',
    dropbox: 'Dropbox',
    link: 'Enlace',
    camera: 'Cámara',
    audio: 'Audio',
    screenCapture: 'Captura de pantalla',

    dragFileOr: 'Arrastra tu archivo o',
    dragFilesOr: 'Arrastra tus archivos o',
    dragFileHere: 'Arrastra tu archivo aquí',
    dragFilesHere: 'Arrastra tus archivos aquí',
    browseFiles: 'explorar archivos',
    or: 'o',
    selectAFolder: 'seleccionar una carpeta',
    maxFileSizeAllowed_one: 'Tamaño máximo de archivo: {{size}} {{unit}}',
    minFileSizeDisplay: 'Mín. {{size}} {{unit}}',
    allowedFileTypes: 'Tipos permitidos: {{types}}',
    maxFileCount_one: 'Hasta {{limit}} archivo',
    maxFileCount_other: 'Hasta {{limit}} archivos',
    minFileCount_one: 'Se requiere al menos {{limit}} archivo',
    minFileCount_other: 'Se requieren al menos {{limit}} archivos',
    totalFileSizeExceeded: 'El tamaño total de archivos supera el máximo de {{size}} {{unit}}',
    maxTotalFileSizeDisplay: 'Tamaño total máximo: {{size}} {{unit}}',
    maxFileSizeAllowed_other: 'Tamaño máximo de archivos: {{size}} {{unit}}',

    addDocumentsHere:
        'Añade tus documentos aquí, puedes subir hasta {{limit}} archivos',
    builtBy: 'Creado por',

    removeAllFiles: 'Eliminar todos los archivos',
    addingMoreFiles: 'Añadiendo más archivos',
    filesSelected_one: '{{count}} archivo seleccionado',
    filesSelected_other: '{{count}} archivos seleccionados',
    addMore: 'Añadir más',

    uploadFiles_one: 'Subir {{count}} archivo',
    uploadFiles_other: 'Subir {{count}} archivos',

    removeFile: 'Eliminar archivo',
    renameFile: 'Haz clic para renombrar',
    clickToPreview: 'Vista previa',
    zeroBytes: '0 bytes',
    bytes: 'bytes',
    kb: 'KB',
    mb: 'MB',
    gb: 'GB',
    tb: 'TB',

    previewError: 'Error: {{message}}',

    noAcceptedFilesFound: 'No se encontraron archivos aceptados',
    selectThisFolder: 'Seleccionar esta carpeta',
    addFiles_one: 'Añadir {{count}} archivo',
    addFiles_other: 'Añadir {{count}} archivos',

    logOut: 'Cerrar sesión',
    search: 'Buscar',

    enterFileUrl: 'Ingresa la URL del archivo',
    fetch: 'Obtener',

    capture: 'Capturar',
    switchToCamera: 'cambiar a cámara {{side}}',
    addImage: 'Añadir imagen',
    photo: 'Foto',
    video: 'Vídeo',
    startVideoRecording: 'Grabar',
    stopVideoRecording: 'Detener',
    cameraRecording: 'Grabando...',
    addVideo: 'Añadir vídeo',
    mirrorCamera: 'Espejo',

    front: 'frontal',
    back: 'trasera',

    // ── AudioUploader ─────────────────────────────────────────
    startRecording: 'Iniciar grabación',
    stopRecording: 'Detener grabación',
    recording: 'Grabando...',
    addAudio: 'Agregar audio',
    deleteRecording: 'Eliminar grabación',

    // ── ScreenCaptureUploader ─────────────────────────────────
    startScreenCapture: 'Iniciar captura de pantalla',
    stopScreenCapture: 'Detener captura',
    screenRecording: 'Grabando pantalla...',
    addScreenCapture: 'Agregar captura de pantalla',
    deleteScreenCapture: 'Eliminar grabación',

    poweredBy: 'Desarrollado por',
    multipleFilesNotAllowed: 'No se permiten cargas de múltiples archivos',
    failedToGetUploadUrl: 'Error al obtener la URL de carga',
    statusError: 'Estado: {{status}} ({{statusText}}). Detalles: {{details}}',
    networkErrorDuringUpload:
        'Error de red durante la subida - Estado: {{status}} ({{statusText}})',
    missingRequiredConfiguration:
        'Falta la configuración requerida: {{missing}}',
    invalidProvider:
        'Proveedor inválido: {{provider}}. Opciones válidas: {{validOptions}}',
    invalidTokenEndpoint:
        'URL tokenEndpoint inválida: {{tokenEndpoint}} {{error}}',
    maxFileSizeMustBeGreater: 'maxFileSize debe ser mayor que 0',
    invalidAcceptFormat:
        'Formato de accept inválido: {{accept}}. Use tipos MIME, */*, * o extensiones (p. ej. .fbx)',

    unauthorizedAccess: 'Acceso no autorizado al proveedor',
    presignedUrlInvalid: 'La URL prefirmada ha caducado o es inválida',
    temporaryCredentialsInvalid:
        'Las credenciales temporales ya no son válidas',
    corsMisconfigured: 'La configuración CORS impide la carga de archivos',
    fileTooLarge: 'El archivo excede el tamaño máximo permitido',
    invalidFileType: 'El tipo de archivo no está permitido',
    storageQuotaExceeded: 'Se ha superado la cuota de almacenamiento',
    signedUrlGenerationFailed: 'Error al generar la URL firmada de subida',
    uploadFailedWithCode: 'La subida falló con el código de error: {{code}}',
    uploadFailed: 'La subida falló: {{message}}',

    // Dropbox-specific
    dropboxSessionExpired:
        'Su sesión de Dropbox ha expirado. Por favor, vuelva a autenticarse.',
    dropboxMissingPermissions:
        'Su app de Dropbox no tiene los permisos necesarios. Añada los siguientes scopes en Dropbox Developer Console: files.metadata.read, account_info.read',
    failedToRefreshExpiredToken: 'Error al renovar el token caducado',

    // Upup UI messages
    allowedLimitSurpassed: '¡Se ha superado el límite permitido!',
    fileUnsupportedType: '¡{{name}} tiene un tipo no compatible!',
    fileTooLargeName: '{{name}} es mayor que {{size}} {{unit}}!',
    fileTooSmallName: '{{name}} es menor que {{size}} {{unit}}!',
    minFileSizeAllowed_one: 'Se requiere un archivo de mín. {{size}} {{unit}}',
    minFileSizeAllowed_other: 'Se requieren archivos de mín. {{size}} {{unit}}',
    minFileSizeMustBeGreater: 'minFileSize debe ser mayor que 0',
    filePreviouslySelected: '{{name}} ya ha sido seleccionado',
    fileWithUrlPreviouslySelected:
        'Un archivo con esta URL: {{url}} ya ha sido seleccionado',
    errorCompressingFile: 'Error al comprimir {{name}}',
    errorCompressingImage: 'Error al comprimir la imagen {{name}}',
    generatingThumbnails: 'Generando miniaturas...',

    // Integration / Auth errors
    clientIdRequired: 'Se requiere Client ID...',
    popupBlocked: 'Ventana emergente bloqueada',
    dropboxClientIdMissing: 'Falta el clientId de Dropbox',
    dropboxAuthFailed: 'Autenticación de Dropbox fallida',
    genericErrorDetails: 'Error: {{details}}',
    errorProcessingFiles: 'Error al procesar archivos: {{message}}',
    errorSelectingFolder: 'Error al seleccionar carpeta: {{message}}',
    graphClientNotInitialized: 'Graph client no inicializado',
    dropboxNoAccessToken:
        'No se proporcionó token de acceso para la descarga desde Dropbox',

    // MSAL / OneDrive messages
    silentTokenAcquisitionFailed:
        'Fallo en adquisición silenciosa del token: {{details}}',
    msalInitializationFailed: 'Fallo en inicialización MSAL: {{details}}',
    silentTokenAcquisitionProceeding:
        'Fallo en adquisición silenciosa del token, procediendo con inicio de sesión interactivo{{details}}',
    signInFailed: 'Inicio de sesión fallido: {{message}}',
    handleSignInFailed: 'Error al manejar inicio de sesión: {{message}}',
    signOutFailed: 'Error al cerrar sesión: {{message}}',
}
