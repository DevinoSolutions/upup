export const UploadAdapter = {
    INTERNAL: 'INTERNAL',
    GOOGLE_DRIVE: 'GOOGLE_DRIVE',
    ONE_DRIVE: 'ONE_DRIVE',
    BOX: 'BOX',
    LINK: 'LINK',
    CAMERA: 'CAMERA',
    DROPBOX: 'DROPBOX',
    UNSPLASH: 'UNSPLASH',
} as const

export type UPLOAD_ADAPTER = (typeof UploadAdapter)[keyof typeof UploadAdapter]
