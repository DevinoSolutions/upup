declare module 'microsoft' {
    type MicrosoftUser = {
        name: string
        mail: string
        picture?: string
    }

    type MicrosoftToken = {
        secret: string
        expiresOn: number
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
