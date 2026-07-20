import { z } from 'zod'

function fail(scope: string, error: z.ZodError): never {
    const missing = error.issues.map(i => `${i.path.join('.')}: ${i.message}`)
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
    RATE_LIMIT_WINDOW_MS: z.coerce.number().int().positive().default(60_000),
    MASTRA_API_URL: z.string().default('http://localhost:4111'),
    AGENT_ID: z.string().default('playground-agent'),
    EVAL_FAIL_THRESHOLD: z.coerce.number().min(0).max(1).default(0.1),
    // PostHog AI-tracing export. Dataset picks which project (if any) receives
    // traces; the exporter is OFF entirely on `disabled` or a missing token.
    // The deploy passes these bare list-form (unset -> absent), but the
    // preprocess still guards against an empty string just in case.
    POSTHOG_DATASET: z.preprocess(
        v => (v === '' ? undefined : v),
        z.enum(['production', 'e2e', 'disabled']).optional(),
    ),
    POSTHOG_KEY: z.string().min(1).optional(),
    POSTHOG_HOST: z.string().min(1).optional(),
    POSTHOG_E2E_TEST_PROJECT_CAPTURE_TOKEN: z.string().min(1).optional(),
    POSTHOG_E2E_TEST_PROJECT_HOST: z.string().min(1).optional(),
    // e2e project READ key (query:read personal API key) — used ONLY by the
    // ingestion-verification harness. Its presence on a production/disabled
    // runtime is a hard misconfiguration (observability.ts throws): a test-only
    // query credential must never ride a production runtime.
    POSTHOG_E2E_TEST_PROJECT_QUERY_READ_ONLY_PERSONAL_API_KEY: z
        .string()
        .min(1)
        .optional(),
})

const parsed = serverSchema.safeParse(process.env)
export const env = parsed.success ? parsed.data : fail('server', parsed.error)
