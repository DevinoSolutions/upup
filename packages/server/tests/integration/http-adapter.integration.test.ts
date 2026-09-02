// Real HTTP integration test for @useupup/server's Express adapter.
//
// Every OTHER server test drives createUpupHandler as a plain function
// (`handler(new Request(...))`), so the Express middleware chain, the
// Node<->Web bridge (toWebRequest/writeWebResponse), real socket header
// serialization, and CORS-over-the-wire are never exercised. This suite starts
// a REAL Express server on an ephemeral port and hits it with the global
// `fetch`, so the whole adapter path — express.json() -> createUpupMiddleware ->
// node-http-bridge -> handler -> respond.ts -> back over HTTP — is under test.
//
// No external services: storage points at a deliberately dead endpoint. The two
// reachability-dependent routes resolve to their offline outcomes (health =>
// `degraded` but still HTTP 200; multipart/init => the 500 transport safety net),
// which is exactly what lets us assert CORS + x-upup-request-id on the error path
// too. Everything else (routing, CORS, validation, presign's local SigV4 signing)
// is fully deterministic offline. NOT gated behind an env var.

import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import { createRequire } from 'node:module'
import type { Server } from 'node:http'
import { createUpupMiddleware } from '../../src/express'
import { InMemoryTokenStore } from '../../src/tokenStore'
import type { UpupServerConfig } from '../../src/config'

// express ships no type declarations and `@types/express` is intentionally NOT a
// workspace dependency — src/express.ts types Express structurally
// (ExpressReq/ExpressRes) precisely to avoid it. Load express through
// createRequire (no bare-specifier import for tsc to resolve), then narrow it to
// just the slice this harness drives: type-safe, no `any` leak, no new dep.
interface TestExpressApp {
    use(handler: unknown): TestExpressApp
    listen(port: number, hostname: string, callback: () => void): Server
}
interface ExpressFactory {
    (): TestExpressApp
    json(): unknown
}
const express = createRequire(import.meta.url)('express') as ExpressFactory

const ALLOWED_ORIGIN = 'http://allowed.example'
const DISALLOWED_ORIGIN = 'http://evil.example'

const config: UpupServerConfig = {
    storage: {
        type: 'aws',
        bucket: 'http-adapter-test-bucket',
        region: 'us-east-1',
        // Non-empty fake creds: validateServerConfig requires both-or-neither,
        // and presign's SigV4 signing needs a key pair (it never connects).
        accessKeyId: 'AKIAFAKEACCESSKEY0000',
        secretAccessKey: 'fakeSecretAccessKeyfakeSecretAccessKey00',
        // Dead endpoint on purpose — this suite tests the HTTP/adapter/bridge
        // layer, not S3. A closed localhost port fails fast with ECONNREFUSED
        // (no slow timeout), so the reachability-dependent routes settle quickly.
        endpoint: 'http://127.0.0.1:9',
        forcePathStyle: true,
    },
    uploadTokenSecret: 'http-adapter-integration-test-secret-0123456789',
    // Lets us hit /presign + /multipart/init without wiring auth/getUserId.
    allowAnonymousUploads: true,
    // tokenStore is the drive/OAuth persistence seam; supplying it without a
    // getUserId resolver requires opting into the shared anonymous drive
    // namespace (createUpupHandler throws otherwise — demos-only escape hatch).
    allowAnonymous: true,
    tokenStore: new InMemoryTokenStore(),
    cors: {
        allowedOrigins: [ALLOWED_ORIGIN],
        allowedMethods: ['GET', 'POST', 'OPTIONS'],
        allowedHeaders: ['Content-Type', 'Authorization'],
        maxAgeSeconds: 600,
    },
}

let server: Server
let baseUrl: string

const url = (path: string) => `${baseUrl}${path}`

beforeAll(async () => {
    const app = express()
    // express.json() BEFORE the upup middleware: the adapter re-serializes
    // req.body, so the JSON body-parser must have populated it first.
    app.use(express.json())
    app.use(createUpupMiddleware(config))

    await new Promise<void>(resolve => {
        // Bind IPv4 explicitly and fetch 127.0.0.1 to avoid the ::1/127.0.0.1
        // localhost split.
        server = app.listen(0, '127.0.0.1', () => resolve())
    })

    const address = server.address()
    if (!address || typeof address === 'string') {
        throw new Error('Express server did not bind to an ephemeral TCP port')
    }
    baseUrl = `http://127.0.0.1:${address.port}`
})

afterAll(async () => {
    await new Promise<void>((resolve, reject) => {
        server.close(err => (err ? reject(err) : resolve()))
    })
})

describe('server HTTP adapter — real Express + node-http-bridge', () => {
    it('GET /health returns 200 with x-upup-request-id and a JSON body', async () => {
        const res = await fetch(url('/health'))
        expect(res.status).toBe(200)
        expect(res.headers.get('content-type')).toMatch(/application\/json/)
        expect(res.headers.get('x-upup-request-id')).toBeTruthy()

        const body = (await res.json()) as {
            status: string
            checks: { config: string; storage: string }
        }
        // Config IS complete (bucket + region + >=16-char secret), so the config
        // check is ok even though storage is unreachable.
        expect(body.checks.config).toBe('ok')
        // Storage is a dead endpoint -> degraded, but health stays HTTP 200 by
        // design (liveness-friendly: a storage blip must not 5xx the container).
        expect(['ok', 'degraded']).toContain(body.status)
    }, 20_000)

    it('OPTIONS preflight from an allowed origin gets 204 + reflected CORS headers', async () => {
        const res = await fetch(url('/presign'), {
            method: 'OPTIONS',
            headers: {
                Origin: ALLOWED_ORIGIN,
                'Access-Control-Request-Method': 'POST',
                'Access-Control-Request-Headers': 'content-type',
            },
        })
        expect(res.status).toBe(204)
        expect(res.headers.get('access-control-allow-origin')).toBe(
            ALLOWED_ORIGIN,
        )
        expect(res.headers.get('access-control-allow-methods')).toContain(
            'POST',
        )
        // Concrete allowlist match (not '*') => credentialed CORS is allowed.
        expect(res.headers.get('access-control-allow-credentials')).toBe('true')
        expect(res.headers.get('vary')).toContain('Origin')
        expect(res.headers.get('x-upup-request-id')).toBeTruthy()
    })

    it('OPTIONS preflight from a disallowed origin gets 204 but NO CORS origin header', async () => {
        const res = await fetch(url('/presign'), {
            method: 'OPTIONS',
            headers: {
                Origin: DISALLOWED_ORIGIN,
                'Access-Control-Request-Method': 'POST',
            },
        })
        expect(res.status).toBe(204)
        expect(res.headers.get('access-control-allow-origin')).toBeNull()
        expect(res.headers.get('access-control-allow-credentials')).toBeNull()
        // request-id is unconditional — it is added even when CORS declines.
        expect(res.headers.get('x-upup-request-id')).toBeTruthy()
    })

    it('an actual GET with an allowed Origin reflects CORS headers on the response', async () => {
        const res = await fetch(url('/health'), {
            headers: { Origin: ALLOWED_ORIGIN },
        })
        expect(res.status).toBe(200)
        expect(res.headers.get('access-control-allow-origin')).toBe(
            ALLOWED_ORIGIN,
        )
        expect(res.headers.get('access-control-allow-credentials')).toBe('true')
        expect(res.headers.get('x-upup-request-id')).toBeTruthy()
    }, 20_000)

    it('an unknown path returns the handler 404 (Express falls through to the middleware)', async () => {
        const res = await fetch(url('/nope/not-a-route'))
        expect(res.status).toBe(404)
        expect(res.headers.get('x-upup-request-id')).toBeTruthy()
        const body = (await res.json()) as { error: string }
        expect(body.error).toBe('Not found')
    })

    it('POST /presign round-trips a JSON body through express.json + the bridge (200)', async () => {
        const res = await fetch(url('/presign'), {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                name: 'hello.png',
                type: 'image/png',
                size: 1234,
            }),
        })
        expect(res.status).toBe(200)
        expect(res.headers.get('content-type')).toMatch(/application\/json/)
        expect(res.headers.get('x-upup-request-id')).toBeTruthy()

        const body = (await res.json()) as {
            key: string
            uploadUrl: string
            uploadHeaders: Record<string, string>
        }
        // Anonymous namespace + preserved sanitized filename.
        expect(body.key.startsWith('anon/')).toBe(true)
        expect(body.key.split('/').pop()).toBe('hello.png')
        // Locally-signed PutObject URL — points at our (dead) S3 endpoint.
        expect(body.uploadUrl.startsWith('http')).toBe(true)
        expect(body.uploadUrl).toContain('http-adapter-test-bucket')
        expect(body.uploadHeaders['Content-Type']).toBe('image/png')
    })

    it('POST /presign with invalid metadata is rejected by validation (400)', async () => {
        const res = await fetch(url('/presign'), {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ name: '', type: 'image/png', size: -1 }),
        })
        expect(res.status).toBe(400)
        expect(res.headers.get('x-upup-request-id')).toBeTruthy()
        const body = (await res.json()) as { error: string; code: string }
        expect(body.code).toBeTruthy()
    })

    it('a storage-touching route still returns a coded 500 + CORS + request-id via the transport safety net', async () => {
        // /multipart/init actually calls S3 (CreateMultipartUpload) — against the
        // dead endpoint it throws, and handler.ts's last-resort catch must turn
        // that into a logged, CORS-headered, coded 500 (never an uncaught crash).
        const res = await fetch(url('/multipart/init'), {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                Origin: ALLOWED_ORIGIN,
            },
            body: JSON.stringify({
                name: 'big.bin',
                type: 'application/octet-stream',
                size: 8 * 1024 * 1024,
            }),
        })
        expect(res.status).toBe(500)
        // CORS + correlation id survive the error path.
        expect(res.headers.get('access-control-allow-origin')).toBe(
            ALLOWED_ORIGIN,
        )
        expect(res.headers.get('x-upup-request-id')).toBeTruthy()
        const body = (await res.json()) as { error: string; code: string }
        expect(body.code).toBeTruthy()
    }, 20_000)

    it('every response carries a fresh, unique x-upup-request-id', async () => {
        const [a, b] = await Promise.all([
            fetch(url('/nope')),
            fetch(url('/nope')),
        ])
        const idA = a.headers.get('x-upup-request-id')
        const idB = b.headers.get('x-upup-request-id')
        expect(idA).toBeTruthy()
        expect(idB).toBeTruthy()
        expect(idA).not.toBe(idB)
    })
})
