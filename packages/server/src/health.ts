// packages/server/src/health.ts
//
// GET /health — answers "is config complete?" and "can we reach storage?" in
// one unauthenticated request, without a real upload. Booleans + a config-
// completeness summary only by default; no secret VALUES are ever returned.
// The cross-instance secret fingerprint (first 8 hex of SHA-256(secret)) is
// opt-in via config.health.exposeSecretFingerprint — enough to spot fleet
// drift (a rolling redeploy that didn't share the same uploadTokenSecret)
// without being reversible to the secret itself.

import type { UpupServerConfig } from './config'
import type { Responder } from './respond'
import { checkStorageReachable } from './providers/aws'
import { reportServerError, toSafeError } from './observability'
import { DEFAULT_UPLOAD_TOKEN_TTL_SECONDS } from './uploadToken'

type StorageCheckCache = { ok: true } | { ok: false } | undefined
let cachedStorageCheck: StorageCheckCache
let cachedAt = 0
const STORAGE_CHECK_TTL_MS = 30_000

/** Test-only: force the next handleHealth() call to re-probe storage instead
 *  of serving the TTL-cached result. Not exported from the package's public
 *  entry (index.ts) — internal to this module's test suite. */
export function _resetStorageCheckCacheForTests(): void {
    cachedStorageCheck = undefined
    cachedAt = 0
}

function isConfigComplete(config: UpupServerConfig): boolean {
    return Boolean(
        config.storage.bucket &&
        config.storage.region &&
        config.uploadTokenSecret &&
        config.uploadTokenSecret.length >= 16,
    )
}

async function sha256Hex(input: string): Promise<string> {
    const bytes = new TextEncoder().encode(input)
    const digest = await crypto.subtle.digest('SHA-256', bytes)
    return Array.from(new Uint8Array(digest))
        .map(b => b.toString(16).padStart(2, '0'))
        .join('')
}

export async function handleHealth(
    config: UpupServerConfig,
    res: Responder,
): Promise<Response> {
    const configOk = isConfigComplete(config)

    const now = Date.now()
    if (!cachedStorageCheck || now - cachedAt > STORAGE_CHECK_TTL_MS) {
        const result = await checkStorageReachable(config.storage)
        if (!result.ok) {
            reportServerError(config.onError, {
                route: 'health',
                method: 'GET',
                status: 200,
                code: 'STORAGE_ERROR',
                message: 'Health check: storage unreachable',
                requestId: res.requestId,
                error: toSafeError(result.error),
            })
        }
        cachedStorageCheck = result.ok ? { ok: true } : { ok: false }
        cachedAt = now
    }

    const body: Record<string, unknown> = {
        status: configOk && cachedStorageCheck.ok ? 'ok' : 'degraded',
        checks: {
            config: configOk ? 'ok' : 'incomplete',
            storage: cachedStorageCheck.ok ? 'ok' : 'error',
        },
        // Non-secret operational summary — labels/flags/counts only, never any
        // secret VALUE. Lets an operator eyeball how an instance is configured
        // (which storage backend, whether anonymous access is open, how many
        // drive providers are wired, the upload-token lifetime) from the same
        // unauthenticated probe.
        summary: {
            storageType: config.storage.type,
            anonymousUploads: Boolean(config.allowAnonymousUploads),
            anonymousDrives: Boolean(config.allowAnonymous),
            driveProviders: config.providers
                ? Object.keys(config.providers).length
                : 0,
            uploadTokenTtlSeconds: DEFAULT_UPLOAD_TOKEN_TTL_SECONDS,
        },
    }

    if (config.health?.exposeSecretFingerprint && config.uploadTokenSecret) {
        body.uploadTokenFingerprint = (
            await sha256Hex(config.uploadTokenSecret)
        ).slice(0, 8)
    }

    // Always 200: this is a liveness-friendly endpoint (deploy/orchestration
    // probes should not 5xx a container just because S3 blipped); the `status`
    // field carries the actual health signal for humans/dashboards.
    return res.json(body)
}
