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
 * upup server config). Credentials/secrets fail fast BY NAME so a deploy that
 * forgot one cannot silently boot on a committed fallback — there is
 * deliberately no default literal for these. Returns the resolved values so
 * callers get a `string` (not `string | undefined`).
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

// Non-secret conveniences only. MinIO endpoint/bucket/region may keep defaults
// (they mirror local-dev/.env.minio.example — MinIO on :9100, never :9000).
// Credentials (MINIO_ROOT_USER/PASSWORD) and UPUP_UPLOAD_TOKEN_SECRET are
// intentionally NOT defaulted here — they are required by name via
// requireServerEnv() in lib/upup-config.ts.
const serverSchema = z.object({
    UPUP_E2E_BUCKET: z.string().min(1).default('upup-e2e'),
    UPUP_E2E_REGION: z.string().min(1).default('us-east-1'),
    UPUP_E2E_ENDPOINT: z.string().min(1).default('http://localhost:9100'),
})

const parsed = serverSchema.safeParse(process.env)
export const env = parsed.success ? parsed.data : fail('server', parsed.error)
