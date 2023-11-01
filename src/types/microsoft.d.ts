declare module 'microsoft' {
    type MicrosoftUser = {
        name: string
        mail: string
    }

    type MicrosoftToken = {
        secret: string
        expiresOn: number
    }

    type ThumbnailSize = {
        width: number
        height: number
        url: string
    }

    type Thumbnails = {
        large: ThumbnailSize
        medium: ThumbnailSize
        small: ThumbnailSize
    }

    type OneDriveFile = {
        id: string
        name: string
        parentReference?: {
            id: string
        }
        thumbnails?: Thumbnails
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
