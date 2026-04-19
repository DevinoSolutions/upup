import type { Translations } from '../types'

export const fr_FR: Translations = {
    cancel: 'Annuler',
    done: 'Terminé',
    loading: 'Chargement...',

    myDevice: 'Mon appareil',
    googleDrive: 'Google Drive',
    oneDrive: 'OneDrive',
    dropbox: 'Dropbox',
    box: 'Box',
    link: 'Lien',
    camera: 'Caméra',
    audio: 'Audio',
    screenCapture: 'Screen Capture',

    dragFileOr: 'Glissez votre fichier ou',
    dragFilesOr: 'Glissez vos fichiers ou',
    browseFiles: 'parcourir',
    or: 'ou',
    selectAFolder: 'sélectionner un dossier',
    maxFileSizeAllowed_one: 'Fichier de {{size}} {{unit}} maximum autorisé',
    maxFileSizeAllowed_other: 'Fichiers de {{size}} {{unit}} maximum autorisés',

    addDocumentsHere:
        "Ajoutez vos documents ici, vous pouvez télécharger jusqu'à {{limit}} fichiers",
    builtBy: 'Créé par',

    removeAllFiles: 'Supprimer tous les fichiers',
    addingMoreFiles: 'Ajout de fichiers',
    filesSelected_one: '{{count}} fichier sélectionné',
    filesSelected_other: '{{count}} fichiers sélectionnés',
    addMore: 'Ajouter',
    switchToListView: 'Switch to list view',
    switchToGridView: 'Switch to grid view',

    dropzoneLabel: 'Drop files here or press Enter to browse',

    uploadFiles_one: 'Télécharger {{count}} fichier',
    uploadFiles_other: 'Télécharger {{count}} fichiers',
    resumeUpload: 'Resume Upload',
    retryUpload: 'Retry Upload',
    pauseUpload: 'Pause upload',
    paused: 'En pause',

    removeFile: 'Supprimer le fichier',
    clickToPreview: 'Aperçu',
    editImage: 'Edit image',
    uploadProgress: 'Upload progress',
    closeEditor: 'Close editor',
    zeroBytes: '0 octet',
    bytes: 'octets',
    kb: 'Ko',
    mb: 'Mo',
    gb: 'Go',
    tb: 'To',

    previewError: 'Erreur : {{message}}',

    noAcceptedFilesFound: 'Aucun fichier accepté trouvé',
    selectThisFolder: 'Sélectionner ce dossier',
    addFiles_one: 'Ajouter {{count}} fichier',
    addFiles_other: 'Ajouter {{count}} fichiers',

    logOut: 'Déconnexion',
    search: 'Rechercher',
    authenticatePrompt: 'Authentifiez-vous avec {{provider}} pour sélectionner des fichiers à téléverser',
    signInWith: 'Se connecter avec {{provider}}',

    enterFileUrl: "Entrez l'URL du fichier",
    fetch: 'Récupérer',

    capture: 'Capturer',
    switchToCamera: 'passer à la caméra {{side}}',
    addImage: "Ajouter l'image",

    front: 'avant',
    back: 'arrière',

    poweredBy: 'Propulsé par',
    multipleFilesNotAllowed:
        'Les téléchargements de plusieurs fichiers ne sont pas autorisés',
    failedToGetUploadUrl: "Échec de la récupération de l'URL d'envoi",
    statusError: 'Statut : {{status}} ({{statusText}}). Détails : {{details}}',
    networkErrorDuringUpload:
        'Erreur réseau pendant le téléchargement - Statut : {{status}} ({{statusText}})',
    missingRequiredConfiguration:
        'Configuration requise manquante : {{missing}}',
    invalidProvider:
        'Fournisseur invalide : {{provider}}. Options valides : {{validOptions}}',
    invalidTokenEndpoint:
        'URL tokenEndpoint invalide : {{tokenEndpoint}} {{error}}',
    maxFileSizeMustBeGreater: 'maxFileSize doit être supérieur à 0',
    invalidAcceptFormat:
        'Format accept invalide : {{accept}}. Utilisez les types MIME, */*, * ou des extensions (ex. .fbx)',

    unauthorizedAccess: 'Accès non autorisé au fournisseur',
    presignedUrlInvalid: "L'URL pré-signée a expiré ou est invalide",
    temporaryCredentialsInvalid:
        'Les identifiants temporaires ne sont plus valides',
    corsMisconfigured:
        'La configuration CORS empêche le téléchargement de fichiers',
    fileTooLarge: 'Le fichier dépasse la taille maximale autorisée',
    invalidFileType: "Le type de fichier n'est pas autorisé",
    storageQuotaExceeded: 'Le quota de stockage a été dépassé',
    signedUrlGenerationFailed: "Échec de la génération de l'URL signée",
    uploadFailedWithCode:
        "Le téléchargement a échoué avec le code d'erreur : {{code}}",
    uploadFailed: 'Échec du téléchargement : {{message}}',

    // Box-specific
    boxClientIdMissing: 'ClientId Box manquant',
    boxAuthFailed: "Échec de l'authentification Box",
    boxSessionExpired: 'Votre session Box a expiré. Veuillez vous ré-authentifier pour continuer.',
    boxNoAccessToken: "Jeton d'accès Box manquant",

    // Dropbox-specific
    dropboxSessionExpired:
        'Votre session Dropbox a expiré. Veuillez vous ré-authentifier.',
    dropboxMissingPermissions:
        "Votre application Dropbox n'a pas les autorisations nécessaires. Ajoutez les scopes suivants dans la console Dropbox Developer : files.metadata.read, account_info.read",
    failedToRefreshExpiredToken: 'Échec du rafraîchissement du token expiré',

    // Upup UI messages
    allowedLimitSurpassed: 'La limite autorisée a été dépassée !',
    fileUnsupportedType: '{{name}} a un type non pris en charge !',
    fileTooLargeName: '{{name}} est plus grand que {{size}} {{unit}} !',
    fileTooSmallName: '{{name}} is smaller than {{size}} {{unit}}!',
    filePreviouslySelected: '{{name}} a déjà été sélectionné',
    fileWithUrlPreviouslySelected:
        'Un fichier avec cette URL : {{url}} a déjà été sélectionné',
    errorCompressingFile: 'Erreur lors de la compression de {{name}}',

    // Integration / Auth errors
    clientIdRequired: 'Client ID requis...',
    popupBlocked: 'Popup bloqué',
    dropboxClientIdMissing: 'ClientId Dropbox manquant',
    dropboxAuthFailed: "Échec de l'authentification Dropbox",
    genericErrorDetails: 'Erreur : {{details}}',
    errorProcessingFiles:
        'Erreur lors du traitement des fichiers : {{message}}',
    errorSelectingFolder:
        'Erreur lors de la sélection du dossier : {{message}}',
    graphClientNotInitialized: 'Client Graph non initialisé',
    dropboxNoAccessToken:
        "Aucun jeton d'accès fourni pour le téléchargement Dropbox",

    // MSAL / OneDrive messages
    silentTokenAcquisitionFailed:
        "Échec de l'acquisition silencieuse du jeton : {{details}}",
    msalInitializationFailed: "Échec de l'initialisation MSAL : {{details}}",
    silentTokenAcquisitionProceeding:
        "Acquisition silencieuse échouée, poursuite avec l'authentification interactive{{details}}",
    signInFailed: 'Échec de la connexion : {{message}}',
    handleSignInFailed: 'Échec du traitement de la connexion : {{message}}',
    signOutFailed: 'Échec de la déconnexion : {{message}}',
}
