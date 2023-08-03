export const UploadAdapter = {
    INTERNAL: 'INTERNAL',
    GOOGLE_DRIVE: 'GOOGLE_DRIVE',
    ONE_DRIVE: 'ONE_DRIVE',
} as const

type ObjectValues<T> = T[keyof T]

export type UPLOAD_ADAPTER = ObjectValues<typeof UploadAdapter>
