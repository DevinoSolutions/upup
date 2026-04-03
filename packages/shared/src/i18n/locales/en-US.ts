import type { LocaleBundle } from '../types'

export const enUS: LocaleBundle = {
    code: 'en-US',
    language: 'English',
    dir: 'ltr',
    messages: {
        common: {
            cancel: 'Cancel',
            done: 'Done',
            loading: 'Loading...',
            or: 'or',
        },

        adapters: {
            myDevice: 'My Device',
            googleDrive: 'Google Drive',
            oneDrive: 'OneDrive',
            dropbox: 'Dropbox',
            link: 'Link',
            camera: 'Camera',
            audio: 'Audio',
            screenCapture: 'Screen Capture',
        },

        dropzone: {
            dragFilesOr:
                '{count, plural, one {Drag your file or} other {Drag your files or}}',
            dragFilesHere:
                '{count, plural, one {Drag your file here} other {Drag your files here}}',
            browseFiles: 'browse files',
            dragOrBrowse: 'Drag or browse to upload',
            selectAFolder: 'select a folder',
            maxFileSizeAllowed:
                'Max {size} {unit} {count, plural, one {file is allowed} other {files are allowed}}',
            minFileSizeDisplay: 'Min {size} {unit}',
            allowedFileTypes: 'Allowed types: {types}',
            maxFileCount: 'Up to {limit, plural, one {# file} other {# files}}',
            minFileCount:
                'At least {limit, plural, one {# file required} other {# files required}}',
            totalFileSizeExceeded:
                'Total file size exceeds the maximum of {size} {unit}',
            maxTotalFileSizeDisplay: 'Max total size: {size} {unit}',
            addDocumentsHere:
                'Add your documents here, you can upload up to {limit} files max',
            dropAriaLabel: 'Drop files here or click to browse',
        },

        header: {
            removeAllFiles: 'Remove all files',
            addingMoreFiles: 'Adding more files',
            filesSelected:
                '{count, plural, one {# file selected} other {# files selected}}',
            addMore: 'Add More',
        },

        fileList: {
            uploadFiles:
                'Upload {count, plural, one {# file} other {# files}}',
            resumeUpload: 'Resume',
            pauseUpload: 'Pause',
        },

        filePreview: {
            removeFile: 'Remove file',
            renameFile: 'Click to rename',
            clickToPreview: 'Click to preview',
            editImage: 'Edit image',
            zeroBytes: '0 Byte',
            bytes: 'Bytes',
            kb: 'KB',
            mb: 'MB',
            gb: 'GB',
            tb: 'TB',
            previewError: 'Error: {message}',
        },

        driveBrowser: {
            noAcceptedFilesFound: 'No accepted files found',
            selectThisFolder: 'Select this folder',
            addFiles:
                'Add {count, plural, one {# file} other {# files}}',
            logOut: 'Log out',
            search: 'Search',
            authenticatePrompt:
                'Authenticate with {provider} to select files for upload',
            signInWith: 'Sign in with {provider}',
        },

        url: {
            enterFileUrl: 'Enter file url',
            fetch: 'Fetch',
        },

        camera: {
            capture: 'Capture',
            switchToCamera: 'switch to {side}',
            addImage: 'Add Image',
            photo: 'Photo',
            video: 'Video',
            startVideoRecording: 'Record',
            stopVideoRecording: 'Stop',
            cameraRecording: 'Recording...',
            addVideo: 'Add Video',
            mirrorCamera: 'Mirror',
            front: 'front',
            back: 'back',
        },

        audio: {
            startRecording: 'Start Recording',
            stopRecording: 'Stop Recording',
            recording: 'Recording...',
            addAudio: 'Add Audio',
            deleteRecording: 'Delete Recording',
        },

        screenCapture: {
            startScreenCapture: 'Start Screen Capture',
            stopScreenCapture: 'Stop Capture',
            screenRecording: 'Recording Screen...',
            addScreenCapture: 'Add Screen Capture',
            deleteScreenCapture: 'Delete Recording',
        },

        branding: {
            poweredBy: 'Powered by',
            builtBy: 'Built by',
        },

        errors: {
            multipleFilesNotAllowed: 'Multiple file uploads are not allowed',
            failedToGetUploadUrl: 'Failed to get upload URL',
            statusError:
                'Status: {status} ({statusText}). Details: {details}',
            networkErrorDuringUpload:
                'Network error during upload - Status: {status} ({statusText})',
            missingRequiredConfiguration:
                'Missing required configuration: {missing}',
            invalidProvider:
                'Invalid provider: {provider}. Valid options: {validOptions}',
            invalidTokenEndpoint:
                'Invalid tokenEndpoint URL: {tokenEndpoint} {error}',
            maxFileSizeMustBeGreater: 'maxFileSize must be greater than 0',
            invalidAcceptFormat:
                'Invalid accept format: {accept}. Use MIME types, */*, * or extensions (like .fbx)',
            unauthorizedAccess: 'Unauthorized access to Provider',
            presignedUrlInvalid: 'Presigned URL has expired or is invalid',
            temporaryCredentialsInvalid:
                'Temporary credentials are no longer valid',
            corsMisconfigured: 'CORS configuration prevents file upload',
            fileTooLarge: 'File exceeds maximum size limit',
            invalidFileType: 'File type is not allowed',
            storageQuotaExceeded: 'Storage quota has been exceeded',
            signedUrlGenerationFailed: 'Failed to generate signed upload URL',
            uploadFailedWithCode: 'Upload failed with error code: {code}',
            uploadFailed: 'Upload failed: {message}',
            dropboxSessionExpired:
                'Your Dropbox session has expired. Please re-authenticate to continue.',
            dropboxMissingPermissions:
                'Your Dropbox app is missing required permissions. Please add the following scopes in the Dropbox Developer Console: files.metadata.read, account_info.read',
            failedToRefreshExpiredToken: 'Failed to refresh expired token',
            allowedLimitSurpassed: 'Allowed limit has been surpassed!',
            fileUnsupportedType: '{name} has an unsupported type!',
            fileTooLargeName: '{name} is larger than {size} {unit}!',
            fileTooSmallName: '{name} is smaller than {size} {unit}!',
            minFileSizeAllowed:
                'Min {size} {unit} {count, plural, one {file is required} other {files are required}}',
            minFileSizeMustBeGreater: 'minFileSize must be greater than 0',
            filePreviouslySelected: '{name} has previously been selected',
            fileWithUrlPreviouslySelected:
                'A file with this url: {url} has previously been selected',
            errorCompressingFile: 'Error compressing {name}',
            errorCompressingImage: 'Error compressing image {name}',
            generatingThumbnails: 'Generating thumbnails...',
            clientIdRequired: 'Client ID is required...',
            popupBlocked: 'Popup blocked',
            dropboxClientIdMissing: 'Dropbox clientId missing',
            dropboxAuthFailed: 'Dropbox authentication failed',
            genericErrorDetails: 'Error: {details}',
            errorProcessingFiles: 'Error processing files: {message}',
            errorSelectingFolder: 'Error selecting folder: {message}',
            graphClientNotInitialized: 'Graph client not initialized',
            dropboxNoAccessToken:
                'No access token provided for Dropbox download',
            silentTokenAcquisitionFailed:
                'Silent token acquisition failed: {details}',
            msalInitializationFailed:
                'MSAL initialization failed: {details}',
            silentTokenAcquisitionProceeding:
                'Silent token acquisition failed, proceeding with interactive login{details}',
            signInFailed: 'Sign-in failed: {message}',
            handleSignInFailed: 'Handle sign-in failed: {message}',
            signOutFailed: 'Sign-out failed: {message}',
            imageEditorFailed: 'Image editor failed to load...',
        },
    },
}
