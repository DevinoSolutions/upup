declare module 'microsoft' {
    type MicrosoftUser = {
        name: string
        mail: string
    }

    type MicrosoftToken = {
        secret: string
        expiresOn: number
    }

    type OneDriveFile = {
        id: string
        name: string
        parentReference?: {
            id: string
        }
        thumbnailLink?: string
        file?: {
            mimeType: string
        }
        children?: OneDriveFile[]
        folder?: {
            childCount: number
        }
    }

    type OneDriveRoot = {
        id: string
        name: string
        children: OneDriveFile[]
    }
}
