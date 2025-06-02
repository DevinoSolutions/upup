declare module 'dropbox' {
    export interface DropboxUser {
        name: string
        email: string
        given_name?: string
        family_name?: string
        locale?: string
        picture?: string
        sub?: string
        token?: string
    }

    export interface DropboxFile {
        id: string
        name: string
        path_display: string
        isFolder: boolean
        size?: number
        thumbnailLink?: string | null
        children?: DropboxFile[]
        mimeType?: string
        file?: {
            mimeType?: string
        }
        thumbnails?: {
            small?: { url?: string }
            medium?: { url?: string }
            large?: { url?: string }
        }
    }

    export interface DropboxRoot {
        id: string
        name: string
        isFolder: boolean
        children: DropboxFile[]
    }
}
