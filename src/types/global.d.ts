import { z } from 'zod'

const envVariables = z.object({
    SPACE_SECRET: z.string() || z.undefined(),
    SPACE_KEY: z.string() || z.undefined(),
    SPACE_ENDPOINT: z.string() || z.undefined(),
    SPACE_REGION: z.string() || z.undefined(),
    SPACE_DOCUMENTS: z.string() || z.undefined(),
    SPACE_IMAGES: z.string() || z.undefined(),
    ONEDRIVE_CLIENT_ID: z.string() || z.undefined(),
    GOOGLE_CLIENT_ID: z.string() || z.undefined(),
    GOOGLE_APP_ID: z.string() || z.undefined(),
    GOOGLE_API_KEY: z.string() || z.undefined(),
})

envVariables.parse(process.env)

declare global {
    namespace NodeJS {
        interface ProcessEnv extends z.infer<typeof envVariables> {}
    }
    interface Window {
        google?: any
        tokenClient?: any
    }
}
