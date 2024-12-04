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
        isFolder: boolean
        children?: OneDriveFile[]
        thumbnails?: {
            small: { url: string }
            medium: { url: string }
            large: { url: string }
        } | null
        '@microsoft.graph.downloadUrl'?: string
        file?: {
            mimeType: string
        }
    }

    type OneDriveRoot = {
        id: string
        name: string
        isFolder: boolean
        children: OneDriveFile[]
    }
}
