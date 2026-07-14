import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

vi.mock('../src/providers/aws', async importOriginal => {
    const actual = await importOriginal<typeof import('../src/providers/aws')>()
    return {
        ...actual,
        checkStorageReachable: vi.fn(),
    }
})

import { handleHealth, _resetStorageCheckCacheForTests } from '../src/health'
import { createResponder } from '../src/respond'
import { checkStorageReachable } from '../src/providers/aws'
import type { UpupServerConfig } from '../src/config'

type HealthBody = {
    status: string
    checks: { config: string; storage: string }
    uploadTokenFingerprint?: string
    summary?: {
        storageType: string
        anonymousUploads: boolean
        anonymousDrives: boolean
        driveProviders: number
        uploadTokenTtlSeconds: number
    }
}

const baseConfig: UpupServerConfig = {
    storage: { type: 'aws', bucket: 'test-bucket', region: 'us-east-1' },
    uploadTokenSecret: 'health-test-secret-0123456789ab',
}

// handleHealth returns through the per-request Responder (F-715) — build a
// real one, not a stub, so header behavior matches production.
const responder = (config: UpupServerConfig = baseConfig) =>
    createResponder(new Request('http://localhost/health'), config)

describe('handleHealth', () => {
    beforeEach(() => {
        vi.mocked(checkStorageReachable).mockReset()
        _resetStorageCheckCacheForTests()
    })
    afterEach(() => {
        vi.restoreAllMocks()
    })

    it('reports ok/ok when config is complete and storage is reachable', async () => {
        vi.mocked(checkStorageReachable).mockResolvedValue({ ok: true })
        const res = await handleHealth(baseConfig, responder())
        const body = (await res.json()) as HealthBody
        expect(res.status).toBe(200)
        expect(body.status).toBe('ok')
        expect(body.checks.config).toBe('ok')
        expect(body.checks.storage).toBe('ok')
    })

    it('returns through the Responder: x-upup-request-id present (F-715)', async () => {
        vi.mocked(checkStorageReachable).mockResolvedValue({ ok: true })
        const res = await handleHealth(baseConfig, responder())
        expect(res.headers.get('x-upup-request-id')).toBeTruthy()
        expect(res.headers.get('Content-Type')).toBe('application/json')
    })

    it('reports config incomplete when the bucket is missing', async () => {
        vi.mocked(checkStorageReachable).mockResolvedValue({ ok: true })
        const incomplete: UpupServerConfig = {
            ...baseConfig,
            storage: { type: 'aws', bucket: '', region: 'us-east-1' },
        }
        const res = await handleHealth(incomplete, responder(incomplete))
        const body = (await res.json()) as HealthBody
        expect(body.checks.config).toBe('incomplete')
    })

    it('reports storage error and fires config.onError when the probe throws', async () => {
        const onError = vi.fn()
        vi.mocked(checkStorageReachable).mockResolvedValue({
            ok: false,
            error: new Error('bucket not found'),
        })
        const res = await handleHealth({ ...baseConfig, onError }, responder())
        const body = (await res.json()) as HealthBody
        expect(body.checks.storage).toBe('error')
        expect(onError).toHaveBeenCalledTimes(1)
    })

    it('omits the secret fingerprint by default', async () => {
        vi.mocked(checkStorageReachable).mockResolvedValue({ ok: true })
        const res = await handleHealth(baseConfig, responder())
        const body = (await res.json()) as HealthBody
        expect(body.uploadTokenFingerprint).toBeUndefined()
    })

    it('includes the secret fingerprint when opted in', async () => {
        vi.mocked(checkStorageReachable).mockResolvedValue({ ok: true })
        const res = await handleHealth(
            { ...baseConfig, health: { exposeSecretFingerprint: true } },
            responder(),
        )
        const body = (await res.json()) as HealthBody
        expect(typeof body.uploadTokenFingerprint).toBe('string')
        expect(body.uploadTokenFingerprint).toHaveLength(8)
    })

    it('caches the storage probe result within the TTL window (does not re-probe every request)', async () => {
        vi.mocked(checkStorageReachable).mockResolvedValue({ ok: true })
        await handleHealth(baseConfig, responder())
        await handleHealth(baseConfig, responder())
        await handleHealth(baseConfig, responder())
        expect(checkStorageReachable).toHaveBeenCalledTimes(1)
    })

    it('includes a non-secret operational summary (storage type, anon flags, drive count, token TTL)', async () => {
        vi.mocked(checkStorageReachable).mockResolvedValue({ ok: true })
        const cfg: UpupServerConfig = {
            ...baseConfig,
            allowAnonymousUploads: true,
            providers: {
                googleDrive: { clientId: 'g', clientSecret: 'gs' },
                dropbox: { appKey: 'd', appSecret: 'ds' },
            },
        }
        const res = await handleHealth(cfg, responder(cfg))
        const body = (await res.json()) as HealthBody
        expect(body.summary).toMatchObject({
            storageType: 'aws',
            anonymousUploads: true,
            anonymousDrives: false,
            driveProviders: 2,
        })
        expect(typeof body.summary!.uploadTokenTtlSeconds).toBe('number')
        // The summary must never carry a secret VALUE.
        const serialized = JSON.stringify(body.summary)
        expect(serialized).not.toContain('health-test-secret-0123456789ab')
    })

    it('propagates the request id into the storage-error event (F-742)', async () => {
        const onError = vi.fn()
        vi.mocked(checkStorageReachable).mockResolvedValue({
            ok: false,
            error: new Error('bucket not found'),
        })
        const r = responder({ ...baseConfig, onError })
        await handleHealth({ ...baseConfig, onError }, r)
        expect(onError).toHaveBeenCalledTimes(1)
        expect(onError.mock.calls[0]![0]).toMatchObject({
            route: 'health',
            code: 'STORAGE_ERROR',
            requestId: r.requestId,
        })
    })
})
