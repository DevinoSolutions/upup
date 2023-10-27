declare module 'microsoft' {
    type MicrosoftUser = {
        displayName: string
        mail: string
    }

    type MicrosoftToken = {
        secret: string
        expiresOn: number
    }
}
