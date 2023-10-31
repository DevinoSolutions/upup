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
        thumbnails?: {
            large: string
            medium: string
            small: string
        }
        file?: {
            mimeType: string
        }
        children?: OneDriveFile[]
        folder?: {
            childCount: number
        }
        '@microsoft.graph.downloadUrl'?: string
    }

    type OneDriveRoot = {
        id: string
        name: string
        children: OneDriveFile[]
    }
}
