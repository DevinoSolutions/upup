import { z } from 'zod'

function fail(scope: string, error: z.ZodError): never {
    const missing = error.issues.map(i => `${i.path.join('.')}: ${i.message}`)
    throw new Error(
        `[env] Invalid ${scope} environment:\n  ${missing.join('\n  ')}`,
    )
}

// The ONE sanctioned escape hatch for a missing REQUIRED env var. Any other
// value (including unset) does not bypass — the boundary throws by name.
const REQUIRED_ENV_BYPASS_FLAG =
    'DANGEROUSLY_BOOT_WITH_MISSING_REQUIRED_ENV_AND_SKIP_VALIDATION'
const REQUIRED_ENV_BYPASS_VALUE =
    'I_UNDERSTAND_THIS_MAY_CRASH_CORRUPT_DATA_OR_EXPOSE_BROKEN_BEHAVIOR'

/**
 * Require named environment variables at the boundary that needs them (the
 * upload route). A missing value fails fast BY NAME so a deploy that forgot it
 * cannot silently boot on a public fallback secret — there is deliberately no
 * default literal for these. Returns the resolved values so callers get a
 * `string` (not `string | undefined`).
 */
export function requireServerEnv<K extends string>(
    keys: readonly K[],
): Record<K, string> {
    const resolved = {} as Record<K, string>
    const missing: K[] = []
    for (const key of keys) {
        const value = process.env[key]
        if (typeof value === 'string' && value.length > 0) resolved[key] = value
        else {
            resolved[key] = ''
            missing.push(key)
        }
    }
    if (missing.length === 0) return resolved

    if (process.env[REQUIRED_ENV_BYPASS_FLAG] === REQUIRED_ENV_BYPASS_VALUE) {
        console.error(
            [
                '',
                '################################################################',
                '#  DANGER — required environment validation SKIPPED',
                `#  ${REQUIRED_ENV_BYPASS_FLAG}`,
                '#  is set to the acknowledged override value.',
                '#',
                `#  Missing required variable(s): ${missing.join(', ')}`,
                '#',
                '#  The app may CRASH, CORRUPT DATA, or EXPOSE BROKEN BEHAVIOR',
                '#  (e.g. boot the upload trust model on an empty HMAC secret).',
                '#  NEVER set this bypass in production.',
                '################################################################',
                '',
            ].join('\n'),
        )
        return resolved
    }

    throw new Error(
        `[env] Missing required environment variable(s): ${missing.join(', ')}.\n` +
            `  Set the variable(s) above. As a LAST-RESORT dev escape hatch only, set\n` +
            `  ${REQUIRED_ENV_BYPASS_FLAG}=${REQUIRED_ENV_BYPASS_VALUE}\n` +
            `  to skip this check and boot with broken/insecure behavior.`,
    )
}

// ── Server (route handlers only — never imported from client components) ─
// UPUP_UPLOAD_TOKEN_SECRET is intentionally NOT in this schema: it has no safe
// default and is required by name via requireServerEnv() where the handler is
// constructed (see app/api/upup/[...path]/route.ts).
const serverSchema = z.object({
    S3_BUCKET: z.string().min(1).optional(),
    S3_REGION: z.string().min(1).optional(),
    S3_KEY_ID: z.string().min(1).optional(),
    S3_SECRET: z.string().min(1).optional(),
    S3_ENDPOINT: z.string().min(1).optional(),
    GOOGLE_CLIENT_ID: z.string().default(''),
    GOOGLE_CLIENT_SECRET: z.string().default(''),
    DROPBOX_CLIENT_ID: z.string().default(''),
    DROPBOX_APP_SECRET: z.string().default(''),
    ONEDRIVE_CLIENT_ID: z.string().default(''),
    ONEDRIVE_CLIENT_SECRET: z.string().default(''),
    // Analytics dataset isolation (see src/lib/analytics/dataset.ts). Bare
    // list-form passthrough in compose keeps an unset value ABSENT (never the
    // empty string), but the preprocess still guards against '' just in case.
    POSTHOG_DATASET: z.preprocess(
        v => (v === '' ? undefined : v),
        z.enum(['production', 'e2e', 'disabled']).optional(),
    ),
    // Server-side verification of the e2e project's ingested events (test
    // scripts only — never used to capture from app code).
    POSTHOG_E2E_TEST_PROJECT_ID: z.string().min(1).optional(),
    // Support/feedback email leg (optional — absent disables the email path).
    SMTP_URL: z.string().min(1).optional(),
    SUPPORT_EMAIL_TO: z.string().min(1).optional(),
    SUPPORT_EMAIL_FROM: z.string().min(1).optional(),
})

export const env: z.infer<typeof serverSchema> = (() => {
    if (typeof window !== 'undefined') return {} as z.infer<typeof serverSchema>
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
    NEXT_PUBLIC_POSTHOG_KEY: z.string().optional(),
    NEXT_PUBLIC_POSTHOG_HOST: z.string().default('https://posthog.devino.ca'),
    // Analytics dataset selector, mirrored from the server POSTHOG_DATASET at
    // build time. Kept a plain string (not an enum) so an empty build arg can
    // never crash the client boot — dataset.ts validates the value.
    NEXT_PUBLIC_POSTHOG_DATASET: z.string().optional(),
    // e2e-project credentials — used ONLY when the dataset resolves to 'e2e'.
    NEXT_PUBLIC_POSTHOG_E2E_TEST_PROJECT_HOST: z.string().optional(),
    NEXT_PUBLIC_POSTHOG_E2E_TEST_PROJECT_CAPTURE_TOKEN: z.string().optional(),
    // Base URL of the deployed Mastra AI server that powers the Ask-AI panel.
    // Unset → the interactive example falls back to http://localhost:4111.
    NEXT_PUBLIC_MASTRA_BASE_URL: z.string().optional(),
})

const clientParsed = clientSchema.safeParse({
    NEXT_PUBLIC_BASE_URL: process.env.NEXT_PUBLIC_BASE_URL,
    NEXT_PUBLIC_GOOGLE_CLIENT_ID: process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID,
    NEXT_PUBLIC_GOOGLE_API_KEY: process.env.NEXT_PUBLIC_GOOGLE_API_KEY,
    NEXT_PUBLIC_GOOGLE_APP_ID: process.env.NEXT_PUBLIC_GOOGLE_APP_ID,
    NEXT_PUBLIC_ONEDRIVE_CLIENT_ID: process.env.NEXT_PUBLIC_ONEDRIVE_CLIENT_ID,
    NEXT_PUBLIC_DROPBOX_CLIENT_ID: process.env.NEXT_PUBLIC_DROPBOX_CLIENT_ID,
    NEXT_PUBLIC_GOOGLE_ANALYTICS_ID:
        process.env.NEXT_PUBLIC_GOOGLE_ANALYTICS_ID,
    NEXT_PUBLIC_POSTHOG_KEY: process.env.NEXT_PUBLIC_POSTHOG_KEY,
    NEXT_PUBLIC_POSTHOG_HOST: process.env.NEXT_PUBLIC_POSTHOG_HOST,
    NEXT_PUBLIC_POSTHOG_DATASET: process.env.NEXT_PUBLIC_POSTHOG_DATASET,
    NEXT_PUBLIC_POSTHOG_E2E_TEST_PROJECT_HOST:
        process.env.NEXT_PUBLIC_POSTHOG_E2E_TEST_PROJECT_HOST,
    NEXT_PUBLIC_POSTHOG_E2E_TEST_PROJECT_CAPTURE_TOKEN:
        process.env.NEXT_PUBLIC_POSTHOG_E2E_TEST_PROJECT_CAPTURE_TOKEN,
    NEXT_PUBLIC_MASTRA_BASE_URL: process.env.NEXT_PUBLIC_MASTRA_BASE_URL,
})
export const clientEnv = clientParsed.success
    ? clientParsed.data
    : fail('client', clientParsed.error)
