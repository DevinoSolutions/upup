declare module 'google' {
    type User = {
        family_name: string
        given_name: string
        locale: string
        name: string
        picture: string
        sub: string
        token: Token
    }

    type Root = {
        id: string
        name: string
        children: File[]
    }

    type File = {
        id: string
        name: string
        mimeType: string
        fileExtension?: string
        size?: number
        thumbnailLink?: string
        parents?: string[]
        children?: File[]
        isFolder: boolean
    }

    type Token = {
        access_token: string
        expires_in: number
        scope: string
        token_type: string
        error?: unknown
    }
}
