import { z } from 'zod'

function fail(scope: string, error: z.ZodError): never {
    const missing = error.issues.map(i => `${i.path.join('.')}: ${i.message}`)
    throw new Error(
        `[env] Invalid ${scope} environment:\n  ${missing.join('\n  ')}`,
    )
}

export const DEFAULT_OPENROUTER_API_URL = 'https://openrouter.ai/api/v1'
export const DEFAULT_OPENROUTER_MODEL = 'anthropic/claude-haiku-4.5'

export const serverSchema = z.object({
    PORT: z.coerce.number().int().positive().default(4111),
    MASTRA_HOST: z.string().default('localhost'),
    ORIGIN_TOKEN_SECRET: z.string().min(1).optional(),
    ALLOWED_ORIGINS: z.string().optional(),
    DAILY_REQUEST_CAP: z.coerce.number().int().positive().default(5000),
    RATE_LIMIT_CAPACITY: z.coerce.number().int().positive().default(30),
    RATE_LIMIT_WINDOW_MS: z.coerce.number().int().positive().default(60_000),
    // OpenAI-compatible base URL for the agents' model. Unset = OpenRouter
    // through Mastra's built-in `openrouter/...` router (today's behaviour);
    // https://proxyai.devino.ca/v1 routes the agents through the Devino proxy.
    OPENROUTER_API_URL: z.preprocess(
        v => (v === '' ? undefined : v),
        z
            .string()
            .url()
            .default(DEFAULT_OPENROUTER_API_URL)
            .transform(url => url.replace(/\/+$/, '')),
    ),
    // Key for OPENROUTER_API_URL. Mastra's OpenRouter router reads it from
    // process.env on its own; the proxy path passes it explicitly.
    OPENROUTER_API_KEY: z.string().min(1).optional(),
    // Model id both agents use, as the base URL's API names it.
    OPENROUTER_MODEL: z.preprocess(
        v => (v === '' ? undefined : v),
        z.string().min(1).default(DEFAULT_OPENROUTER_MODEL),
    ),
    MASTRA_API_URL: z.string().default('http://localhost:4111'),
    AGENT_ID: z.string().default('playground-agent'),
    // Deployed docs origin the search-docs tool fetches `/docs/llms-full.txt`
    // from. Defaults so an unset/bare-passthrough deploy env stays valid.
    DOCS_BASE_URL: z.string().url().default('https://dev.useupup.com'),
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
