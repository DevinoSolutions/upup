import { z } from 'zod'

function fail(scope: string, error: z.ZodError): never {
    const missing = error.issues.map(
        (i) => `${i.path.join('.')}: ${i.message}`,
    )
    throw new Error(
        `[env] Invalid ${scope} environment:\n  ${missing.join('\n  ')}`,
    )
}

const serverSchema = z.object({
    UPUP_E2E_BUCKET: z.string().min(1).default('upup-e2e'),
    UPUP_E2E_REGION: z.string().min(1).default('us-east-1'),
    UPUP_E2E_ENDPOINT: z
        .string()
        .min(1)
        .default('http://localhost:9100'),
    MINIO_ROOT_USER: z.string().min(1).default('upupadmin'),
    MINIO_ROOT_PASSWORD: z.string().min(1).default('upupadmin123'),
    UPUP_UPLOAD_TOKEN_SECRET: z
        .string()
        .min(1)
        .default('next-example-dev-secret-not-for-prod'),
})

const parsed = serverSchema.safeParse(process.env)
export const env = parsed.success
    ? parsed.data
    : fail('server', parsed.error)
