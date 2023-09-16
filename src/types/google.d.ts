declare module 'google' {
    import { TargetAndTransition } from 'framer-motion'
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
        children: GoogleFile[]
    }

    type GoogleFile = {
        id: string
        name: string
        mimeType: string
        fileExtension?: string
        size?: number
        thumbnailLink?: string
        parents?: string[]
        children?: GoogleFile[]
    }

    type Token = {
        access_token: string
        expires_in: number
        scope: string
        token_type: string
        error?: unknown
    }

    type HoverDefinition = TargetAndTransition & {
        backgroundColor: string
    }

    type TransitionDefinition = {
        duration: number
        delay: number
        backgroundColor: {
            duration: number
            delay: number
        }
    }
}
