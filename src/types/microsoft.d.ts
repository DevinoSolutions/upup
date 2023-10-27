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
        size: number
        webUrl: string
        lastModifiedDateTime: string
        file: {
            mimeType: string
            hashes: {
                quickXorHash: string
                sha1Hash: string
                sha256Hash: string
            }
        }
        folder?: {
            childCount: number
        }
        parentReference: {
            driveId: string
            driveType: string
            id: string
            path: string
        }
        children?: OneDriveFile[]
    }

    type OneDriveRoot = {
        id: string
        name: string
        children: OneDriveFile[]
    }
}
