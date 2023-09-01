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

type ObjectValues<T> = T[keyof T]

export type UPLOAD_ADAPTER = ObjectValues<typeof UploadAdapter>
