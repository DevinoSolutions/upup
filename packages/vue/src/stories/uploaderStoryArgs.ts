import { FileSource, arSA } from '@upup/core'
import type { UpupUploaderProps } from '../shared/types'

export const uploaderCanvasStyle = {
    width: 'min(680px, 92vw)',
    minHeight: '600px',
    padding: '24px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    background: '#f8fafc',
}

export const baseUploaderArgs = {
    sources: [FileSource.LOCAL],
    showBranding: true,
    allowPreview: true,
} satisfies UpupUploaderProps

export const restrictedUploaderArgs = {
    ...baseUploaderArgs,
    restrictions: {
        allowedFileTypes: ['image/*'],
        maxFileSize: { size: 50, unit: 'KB' },
        minFileSize: { size: 1, unit: 'KB' },
        maxNumberOfFiles: 2,
    },
} satisfies UpupUploaderProps

export const rtlUploaderArgs = {
    ...baseUploaderArgs,
    i18n: { bundle: arSA },
} satisfies UpupUploaderProps

export const serverSuccessArgs = {
    ...baseUploaderArgs,
    mode: 'server',
    serverUrl: '/storybook/upup/success',
} satisfies UpupUploaderProps

export const serverErrorArgs = {
    ...baseUploaderArgs,
    mode: 'server',
    serverUrl: '/storybook/upup/error',
} satisfies UpupUploaderProps

export const processingSuccessArgs = {
    ...serverSuccessArgs,
    processingEndpoint: '/storybook/upup/processing/success',
    onFileProcessed: (_file, data) => {
        window.dispatchEvent(
            new CustomEvent('upup-storybook:processed', { detail: data }),
        )
    },
} satisfies UpupUploaderProps

export const processingFailureArgs = {
    ...serverSuccessArgs,
    processingEndpoint: '/storybook/upup/processing/failure',
    onFileProcessed: (_file, data) => {
        window.dispatchEvent(
            new CustomEvent('upup-storybook:processed', { detail: data }),
        )
    },
    onError: message => {
        window.dispatchEvent(
            new CustomEvent('upup-storybook:error', { detail: message }),
        )
    },
} satisfies UpupUploaderProps

export const processingTimeoutArgs = {
    ...serverSuccessArgs,
    processingEndpoint: '/storybook/upup/processing/timeout',
    processingTimeout: 500,
    onFileProcessed: (_file, data) => {
        window.dispatchEvent(
            new CustomEvent('upup-storybook:processed', { detail: data }),
        )
    },
    onError: message => {
        window.dispatchEvent(
            new CustomEvent('upup-storybook:error', { detail: message }),
        )
    },
} satisfies UpupUploaderProps

export const clientUploadSuccessArgs = {
    ...baseUploaderArgs,
    uploadEndpoint: '/storybook/upup/presign/success',
} satisfies UpupUploaderProps

export const clientUploadFailureArgs = {
    ...baseUploaderArgs,
    uploadEndpoint: '/storybook/upup/presign/upload-failure',
    maxRetries: 0,
} satisfies UpupUploaderProps

export const clientUploadSlowArgs = {
    ...baseUploaderArgs,
    uploadEndpoint: '/storybook/upup/presign/slow',
} satisfies UpupUploaderProps

export const urlSourceArgs = {
    ...clientUploadSuccessArgs,
    sources: [FileSource.URL],
} satisfies UpupUploaderProps

export const allSourcesArgs = {
    ...clientUploadSuccessArgs,
    mode: 'server',
    serverUrl: '/storybook/upup/server',
    sources: [
        FileSource.LOCAL,
        FileSource.URL,
        FileSource.CAMERA,
        FileSource.MICROPHONE,
        FileSource.SCREEN,
        FileSource.GOOGLE_DRIVE,
        FileSource.ONE_DRIVE,
        FileSource.DROPBOX,
        FileSource.BOX,
    ],
} satisfies UpupUploaderProps

export const clientCloudAuthArgs = {
    ...baseUploaderArgs,
    sources: [
        FileSource.GOOGLE_DRIVE,
        FileSource.ONE_DRIVE,
        FileSource.DROPBOX,
        FileSource.BOX,
    ],
    cloudDrives: {
        googleDrive: {
            clientId: 'storybook-google-client',
            apiKey: 'storybook-google-api-key',
            appId: 'storybook-google-app',
        },
        oneDrive: {
            clientId: 'storybook-onedrive-client',
            redirectUri: '/storybook/oauth/onedrive',
        },
        dropbox: {
            clientId: 'storybook-dropbox-client',
            redirectUri: '/storybook/oauth/dropbox',
        },
        box: {
            clientId: 'storybook-box-client',
            redirectUri: '/storybook/oauth/box',
        },
    },
} satisfies UpupUploaderProps

export const serverGoogleDriveArgs = {
    ...baseUploaderArgs,
    mode: 'server',
    serverUrl: '/storybook/upup/server',
    sources: [FileSource.GOOGLE_DRIVE],
} satisfies UpupUploaderProps

export const folderUploadArgs = {
    ...baseUploaderArgs,
    folderUpload: {
        allowDrop: true,
        showSelectFolderButton: true,
    },
} satisfies UpupUploaderProps

export const pasteUploadArgs = {
    ...baseUploaderArgs,
    enablePaste: true,
} satisfies UpupUploaderProps

export const dragDropDisabledArgs = {
    ...baseUploaderArgs,
    disableDragDrop: true,
} satisfies UpupUploaderProps

export const miniUploaderArgs = {
    ...clientUploadSuccessArgs,
    mini: true,
} satisfies UpupUploaderProps

export const autoUploadArgs = {
    ...clientUploadSuccessArgs,
    autoUpload: true,
} satisfies UpupUploaderProps

export const localOnlyArgs = {
    ...baseUploaderArgs,
    showBranding: false,
} satisfies UpupUploaderProps

export const messageOverrideArgs = {
    ...baseUploaderArgs,
    i18n: {
        overrides: {
            common: {
                cancel: 'Stop',
            },
            dropzone: {
                browseFiles: 'choose files',
            },
            fileList: {
                uploadFiles:
                    'Send {count, plural, one {my file} other {my files}}',
            },
            header: {
                filesSelected:
                    '{count, plural, one {# selected} other {# selected}}',
            },
        },
    },
} satisfies UpupUploaderProps

export const themeSlotsArgs = {
    ...clientUploadSuccessArgs,
    theme: {
        mode: 'light',
        slots: {
            uploader: {
                container: 'ring-2 ring-slate-300 rounded-md',
            },
            fileList: {
                uploadButton: 'bg-emerald-600 hover:bg-emerald-700 text-white',
            },
            progressBar: {
                fill: 'bg-emerald-500',
            },
            urlUploader: {
                fetchButton: 'bg-slate-900 hover:bg-slate-800 text-white',
            },
        },
    },
} satisfies UpupUploaderProps
