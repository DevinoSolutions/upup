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
    PORT: z.coerce.number().int().positive().default(4111),
    MASTRA_HOST: z.string().default('localhost'),
    ORIGIN_TOKEN_SECRET: z.string().min(1).optional(),
    ALLOWED_ORIGINS: z.string().optional(),
    DAILY_REQUEST_CAP: z.coerce.number().int().positive().default(5000),
    RATE_LIMIT_CAPACITY: z.coerce.number().int().positive().default(30),
    RATE_LIMIT_WINDOW_MS: z.coerce
        .number()
        .int()
        .positive()
        .default(60_000),
    MASTRA_API_URL: z.string().default('http://localhost:4111'),
    AGENT_ID: z.string().default('playground-agent'),
    EVAL_FAIL_THRESHOLD: z.coerce.number().min(0).max(1).default(0.1),
})

const parsed = serverSchema.safeParse(process.env)
export const env = parsed.success
    ? parsed.data
    : fail('server', parsed.error)
