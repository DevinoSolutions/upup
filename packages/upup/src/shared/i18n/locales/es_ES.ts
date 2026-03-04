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

    dragFileOr: 'Arrastra tu archivo o',
    dragFilesOr: 'Arrastra tus archivos o',
    browseFiles: 'explorar archivos',
    or: 'o',
    selectAFolder: 'seleccionar una carpeta',
    maxFileSizeAllowed_one: 'Tamaño máximo de archivo: {{size}} {{unit}}',
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

    front: 'frontal',
    back: 'trasera',

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
    filePreviouslySelected: '{{name}} ya ha sido seleccionado',
    fileWithUrlPreviouslySelected:
        'Un archivo con esta URL: {{url}} ya ha sido seleccionado',
    errorCompressingFile: 'Error al comprimir {{name}}',

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
