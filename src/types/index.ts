import { z } from 'zod'

const envVariables = z.object({
    UNOTES_SPACE_SECRET: z.string() || z.undefined(),
    UNOTES_SPACE_KEY: z.string() || z.undefined(),
    UNOTES_SPACE_ENDPOINT: z.string() || z.undefined(),
    UNOTES_SPACE_REGION: z.string() || z.undefined(),
    UNOTES_DOCUMENT_SPACE: z.string() || z.undefined(),
    UNOTES_IMAGES_SPACE: z.string() || z.undefined(),
    ONEDRIVE_CLIENT_ID: z.string() || z.undefined(),
    GOOGLE_CLIENT_ID_PICKER: z.string() || z.undefined(),
    GOOGLE_APP_ID: z.string() || z.undefined(),
    GOOGLE_API_KEY: z.string() || z.undefined(),
})

envVariables.parse(process.env)

declare global {
    namespace NodeJS {
        interface ProcessEnv extends z.infer<typeof envVariables> {}
    }
}
