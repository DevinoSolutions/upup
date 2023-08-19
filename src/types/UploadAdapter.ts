export const UploadAdapter = {
    INTERNAL: 'INTERNAL',
    GOOGLE_DRIVE: 'GOOGLE_DRIVE',
    ONE_DRIVE: 'ONE_DRIVE',
    LINK: 'LINK',
} as const

type ObjectValues<T> = T[keyof T]

export type UPLOAD_ADAPTER = ObjectValues<typeof UploadAdapter>
