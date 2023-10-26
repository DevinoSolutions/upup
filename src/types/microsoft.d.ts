declare module 'microsoft' {
    type MicrosoftUser = {
        displayName: string
        mail: string
    }

    type MicrosoftToken = {
        access_token: string
        expires_in: number
    }
}
