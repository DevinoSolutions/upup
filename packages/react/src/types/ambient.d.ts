declare module 'uuid' {
    export function v4(): string
}

declare module 'google' {
    export type GoogleFile = {
        id: string
        name: string
        mimeType: string
        size?: string | number
        thumbnailLink?: string
        modifiedTime?: string
        parents?: string[]
        webContentLink?: string
        webViewLink?: string
        children?: GoogleFile[]
        [key: string]: unknown
    }

    export type GoogleRoot = {
        id: string
        name: string
        mimeType?: string
        parents?: string[]
        children: GoogleFile[]
        [key: string]: unknown
    }

    export type Token = {
        access_token: string
        expires_in: number
        error?: string
        [key: string]: unknown
    }

    export type GoogleUser = {
        name: string
        picture?: string
        mail?: string
        emailAddress?: string
        displayName?: string
        photoLink?: string
        [key: string]: unknown
    }
}

declare module 'microsoft' {
    export type OneDriveFile = {
        id: string
        name: string
        size?: number
        isFolder?: boolean
        children?: OneDriveFile[]
        folder?: unknown
        file?: { mimeType?: string }
        image?: unknown
        thumbnails?: {
            small: { url?: string }
            large?: { url?: string }
        } | null
        parentReference?: Record<string, unknown>
        '@microsoft.graph.downloadUrl'?: string
        [key: string]: unknown
    }

    export type OneDriveRoot = OneDriveFile & {
        children: OneDriveFile[]
    }

    export type MicrosoftUser = {
        id?: string
        name: string
        picture?: string
        displayName?: string
        userPrincipalName?: string
        mail?: string
        [key: string]: unknown
    }

    export type MicrosoftToken = {
        accessToken?: string
        secret?: string
        expiresOn?: number
        [key: string]: unknown
    }
}

interface Window {
    google?: any
}
