import { z } from 'zod'

function fail(scope: string, error: z.ZodError): never {
    const missing = error.issues.map(
        (i) => `${i.path.join('.')}: ${i.message}`,
    )
    throw new Error(
        `[env] Invalid ${scope} environment:\n  ${missing.join('\n  ')}`,
    )
}

// ── Server (route handlers only — never imported from client components) ─
const serverSchema = z.object({
    S3_BUCKET: z.string().min(1).optional(),
    S3_REGION: z.string().min(1).optional(),
    S3_KEY_ID: z.string().min(1).optional(),
    S3_SECRET: z.string().min(1).optional(),
    S3_ENDPOINT: z.string().min(1).optional(),
    UPUP_UPLOAD_TOKEN_SECRET: z
        .string()
        .min(1)
        .default('landing-dev-secret-not-for-prod'),
    GOOGLE_CLIENT_ID: z.string().default(''),
    DROPBOX_CLIENT_ID: z.string().default(''),
    DROPBOX_APP_SECRET: z.string().default(''),
    ONEDRIVE_CLIENT_ID: z.string().default(''),
})

export const env: z.infer<typeof serverSchema> = (() => {
    if (typeof window !== 'undefined')
        return {} as z.infer<typeof serverSchema>
    const parsed = serverSchema.safeParse(process.env)
    return parsed.success ? parsed.data : fail('server', parsed.error)
})()

// ── Client (NEXT_PUBLIC_* — inlined at build time) ───────────────────────
const clientSchema = z.object({
    NEXT_PUBLIC_BASE_URL: z.string().optional(),
    NEXT_PUBLIC_GOOGLE_CLIENT_ID: z.string().default(''),
    NEXT_PUBLIC_GOOGLE_API_KEY: z.string().default(''),
    NEXT_PUBLIC_GOOGLE_APP_ID: z.string().default(''),
    NEXT_PUBLIC_ONEDRIVE_CLIENT_ID: z.string().default(''),
    NEXT_PUBLIC_DROPBOX_CLIENT_ID: z.string().default(''),
    NEXT_PUBLIC_GOOGLE_ANALYTICS_ID: z.string().optional(),
})

const clientParsed = clientSchema.safeParse({
    NEXT_PUBLIC_BASE_URL: process.env.NEXT_PUBLIC_BASE_URL,
    NEXT_PUBLIC_GOOGLE_CLIENT_ID:
        process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID,
    NEXT_PUBLIC_GOOGLE_API_KEY: process.env.NEXT_PUBLIC_GOOGLE_API_KEY,
    NEXT_PUBLIC_GOOGLE_APP_ID: process.env.NEXT_PUBLIC_GOOGLE_APP_ID,
    NEXT_PUBLIC_ONEDRIVE_CLIENT_ID:
        process.env.NEXT_PUBLIC_ONEDRIVE_CLIENT_ID,
    NEXT_PUBLIC_DROPBOX_CLIENT_ID:
        process.env.NEXT_PUBLIC_DROPBOX_CLIENT_ID,
    NEXT_PUBLIC_GOOGLE_ANALYTICS_ID:
        process.env.NEXT_PUBLIC_GOOGLE_ANALYTICS_ID,
})
export const clientEnv = clientParsed.success
    ? clientParsed.data
    : fail('client', clientParsed.error)
