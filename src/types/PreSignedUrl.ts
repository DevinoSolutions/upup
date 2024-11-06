export type PreSignedUrlResponse = {
    uploadUrl: string
    key: string
    fields?: {
        [key: string]: string
    }
}

export type PreSignedUrlRequest = {
    fileName: string
    fileType: string
    fileSize: number
}
