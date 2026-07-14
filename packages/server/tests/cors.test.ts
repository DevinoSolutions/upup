import { describe, it, expect, vi } from 'vitest'
import { createUpupHandler } from '../src/handler'
import { InMemoryTokenStore } from '../src/tokenStore'

vi.mock('../src/providers/aws', () => ({
    generatePresignedUrl: vi.fn(),
    initiateMultipartUpload: vi.fn(),
    generatePresignedPartUrl: vi.fn(),
    completeMultipartUpload: vi.fn(),
    abortMultipartUpload: vi.fn(),
    listMultipartParts: vi.fn(),
    getMultipartUploadedSize: vi.fn().mockResolvedValue(0),
}))

const baseConfig = {
    storage: {
        type: 'aws' as const,
        bucket: 'test-bucket',
        region: 'us-east-1',
    },
    uploadTokenSecret: 'cors-test-secret-0123456789abc',
}

function options(url: string, headers?: Record<string, string>) {
    return new Request(url, {
        method: 'OPTIONS',
        ...(headers ? { headers } : {}),
    })
}

describe('CORS — wildcard allowedOrigins with Origin present (audit S3)', () => {
    it('reflects the matched origin instead of emitting literal *', async () => {
        const handler = createUpupHandler({
            ...baseConfig,
            cors: { allowedOrigins: ['*'] },
        })
        const res = await handler(
            options('http://localhost/presign', {
                Origin: 'https://app.example',
            }),
        )
        expect(res.status).toBe(204)
        expect(res.headers.get('Access-Control-Allow-Origin')).toBe(
            'https://app.example',
        )
    })

    it('does NOT set credentials for a wildcard-only match (no concrete allowlist entry)', async () => {
        // Security invariant: reflecting an origin allowed solely via '*' must never
        // be paired with Access-Control-Allow-Credentials, or any site could make
        // credentialed cross-origin reads.
        const handler = createUpupHandler({
            ...baseConfig,
            cors: { allowedOrigins: ['*'] },
        })
        const res = await handler(
            options('http://localhost/presign', {
                Origin: 'https://app.example',
            }),
        )
        expect(res.headers.get('Access-Control-Allow-Credentials')).toBeNull()
    })

    it('includes Vary: Origin when origin is reflected', async () => {
        const handler = createUpupHandler({
            ...baseConfig,
            cors: { allowedOrigins: ['*'] },
        })
        const res = await handler(
            options('http://localhost/presign', {
                Origin: 'https://app.example',
            }),
        )
        expect(res.headers.get('Vary')).toBe('Origin')
    })
})

describe('CORS — wildcard allowedOrigins with NO Origin header', () => {
    it('emits literal * when no Origin header is present (non-browser/curl)', async () => {
        const handler = createUpupHandler({
            ...baseConfig,
            cors: { allowedOrigins: ['*'] },
        })
        const res = await handler(options('http://localhost/presign'))
        expect(res.status).toBe(204)
        expect(res.headers.get('Access-Control-Allow-Origin')).toBe('*')
    })

    it('does NOT include Access-Control-Allow-Credentials when emitting *', async () => {
        const handler = createUpupHandler({
            ...baseConfig,
            cors: { allowedOrigins: ['*'] },
        })
        const res = await handler(options('http://localhost/presign'))
        expect(res.headers.get('Access-Control-Allow-Credentials')).toBeNull()
    })
})

describe('CORS — specific allowlist', () => {
    it('echoes origin and sets credentials when origin is in allowedOrigins', async () => {
        const handler = createUpupHandler({
            ...baseConfig,
            cors: { allowedOrigins: ['https://app.example'] },
        })
        const res = await handler(
            options('http://localhost/presign', {
                Origin: 'https://app.example',
            }),
        )
        expect(res.headers.get('Access-Control-Allow-Origin')).toBe(
            'https://app.example',
        )
        expect(res.headers.get('Access-Control-Allow-Credentials')).toBe('true')
    })

    it('returns no CORS headers for a non-allowlisted origin', async () => {
        const handler = createUpupHandler({
            ...baseConfig,
            cors: { allowedOrigins: ['https://app.example'] },
        })
        const res = await handler(
            options('http://localhost/presign', {
                Origin: 'https://evil.example',
            }),
        )
        expect(res.headers.get('Access-Control-Allow-Origin')).toBeNull()
        expect(res.headers.get('Access-Control-Allow-Credentials')).toBeNull()
    })
})

describe('CORS — mixed allowlist (wildcard + concrete origins)', () => {
    it('credentials a CONCRETELY-listed origin even when * is also present', async () => {
        const handler = createUpupHandler({
            ...baseConfig,
            cors: { allowedOrigins: ['*', 'https://app.example'] },
        })
        const res = await handler(
            options('http://localhost/presign', {
                Origin: 'https://app.example',
            }),
        )
        expect(res.headers.get('Access-Control-Allow-Origin')).toBe(
            'https://app.example',
        )
        expect(res.headers.get('Access-Control-Allow-Credentials')).toBe('true')
    })

    it('does NOT credential an origin matched only via the wildcard in a mixed list', async () => {
        const handler = createUpupHandler({
            ...baseConfig,
            cors: { allowedOrigins: ['*', 'https://app.example'] },
        })
        const res = await handler(
            options('http://localhost/presign', {
                Origin: 'https://other.example',
            }),
        )
        expect(res.headers.get('Access-Control-Allow-Origin')).toBe(
            'https://other.example',
        )
        expect(res.headers.get('Access-Control-Allow-Credentials')).toBeNull()
    })
})

describe('CORS — credentialed reflection is never reachable under a wildcard-only config', () => {
    it.each([
        'https://evil.example',
        'http://localhost:1337',
        'https://sub.attacker.test',
        '*', // a non-browser client crafting a literal Origin: * must still never get credentials
    ])(
        'never emits Allow-Credentials for arbitrary origin %s under allowedOrigins:["*"]',
        async origin => {
            const handler = createUpupHandler({
                ...baseConfig,
                cors: { allowedOrigins: ['*'] },
            })
            const res = await handler(
                options('http://localhost/files/google-drive', {
                    Origin: origin,
                }),
            )
            expect(
                res.headers.get('Access-Control-Allow-Credentials'),
            ).toBeNull()
        },
    )
})

// The un-back-filled half of F-108: OAuth routes were dispatched with NO
// responseHeaders at all, so their error bodies shipped corsless. Every route
// (incl. OAuth) must now carry the matched Access-Control-Allow-Origin.
describe('CORS — OAuth routes carry ACAO (F-108)', () => {
    function get(url: string, headers?: Record<string, string>) {
        return new Request(url, {
            method: 'GET',
            ...(headers ? { headers } : {}),
        })
    }

    const oauthConfig = () => ({
        ...baseConfig,
        cors: { allowedOrigins: ['https://app.example'] },
        tokenStore: new InMemoryTokenStore(),
        allowAnonymous: true,
        providers: { googleDrive: { clientId: 'gid', clientSecret: 'gsec' } },
    })

    it('unknown-provider OAuth redirect (400) carries the matched ACAO', async () => {
        const handler = createUpupHandler(oauthConfig())
        const res = await handler(
            get('http://localhost/api/upup/auth/unknown-x', {
                Origin: 'https://app.example',
            }),
        )
        expect(res.status).toBe(400)
        expect(res.headers.get('Access-Control-Allow-Origin')).toBe(
            'https://app.example',
        )
    })

    it('OAuth callback missing code (400) carries the matched ACAO', async () => {
        const handler = createUpupHandler(oauthConfig())
        const res = await handler(
            get('http://localhost/api/upup/auth/google-drive/cb', {
                Origin: 'https://app.example',
            }),
        )
        expect(res.status).toBe(400)
        expect(res.headers.get('Access-Control-Allow-Origin')).toBe(
            'https://app.example',
        )
    })
})
