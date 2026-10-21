// packages/server/tests/adapter-multi-cookie.test.ts
//
// T-5698: a response carrying SEVERAL Set-Cookie headers must reach the client
// intact through the Fastify adapter. `Headers.forEach` comma-joins them and a
// replacing `reply.header(k, v)` keeps only the last, so the adapter has to
// hand the bridge an appending sink (the Express and Next Pages adapters have
// their own tests: adapters.test.ts and @useupup/next's pages-handler.spec.ts).
//
// The fake reply mirrors REAL Fastify (lib/reply.js): `header()` APPENDS a
// repeated `set-cookie` (string or array) instead of replacing it. A sink that
// re-passes an accumulating list on every call therefore duplicates cookies
// ([c1, c1, c2]); only one `header()` call per cookie yields exactly [c1, c2].
// (fastify itself is not a dependency of this package, so it is faked here.)
import { describe, it, expect, vi } from 'vitest'

const respondWith = vi.hoisted(() => ({
    fn: undefined as undefined | (() => Response),
}))
vi.mock('../src/handler', () => ({
    createUpupHandler: () => async () => (respondWith.fn as () => Response)(),
}))

import { createUpupPlugin } from '../src/fastify'

const config = {
    storage: { type: 'aws' as const, bucket: 'b', region: 'us-east-1' },
    uploadTokenSecret: 'adapters-test-secret-0123456789',
}

function fastifyLikeHeader(sent: Record<string, string | string[]>) {
    return (k: string, v: string | string[]) => {
        const key = k.toLowerCase()
        if (key === 'set-cookie' && sent[key] !== undefined) {
            sent[key] = [sent[key], v].flat()
        } else {
            sent[key] = v
        }
    }
}

describe('Fastify adapter: multiple Set-Cookie headers (T-5698)', () => {
    it('delivers each cookie exactly once to a reply whose header() APPENDS set-cookie (real Fastify)', async () => {
        respondWith.fn = () => {
            const res = new Response('{}', { status: 200 })
            res.headers.append('Set-Cookie', 'a=1; Path=/; HttpOnly')
            res.headers.append('Set-Cookie', '__Host-b=2; Path=/; Secure')
            return res
        }
        const registered: Array<
            (req: unknown, reply: unknown) => Promise<void>
        > = []
        await createUpupPlugin(config)({
            all: (_p: string, h: never) => {
                registered.push(h)
            },
        } as never)

        const sent: Record<string, string | string[]> = {}
        const reply = {
            code: () => reply,
            header: (k: string, v: string | string[]) => {
                fastifyLikeHeader(sent)(k, v)
                return reply
            },
            send: () => reply,
        }
        await registered[0]!(
            {
                protocol: 'http',
                hostname: 'localhost',
                url: '/upup/health',
                method: 'GET',
                headers: {},
                body: undefined,
            },
            reply,
        )
        expect(sent['set-cookie']).toEqual([
            'a=1; Path=/; HttpOnly',
            '__Host-b=2; Path=/; Secure',
        ])
    })

    it('a single cookie is still delivered', async () => {
        respondWith.fn = () => {
            const res = new Response('{}', { status: 200 })
            res.headers.append('Set-Cookie', 'only=1; Path=/')
            return res
        }
        const registered: Array<
            (req: unknown, reply: unknown) => Promise<void>
        > = []
        await createUpupPlugin(config)({
            all: (_p: string, h: never) => {
                registered.push(h)
            },
        } as never)
        const sent: Record<string, string | string[]> = {}
        const reply = {
            code: () => reply,
            header: (k: string, v: string | string[]) => {
                fastifyLikeHeader(sent)(k, v)
                return reply
            },
            send: () => reply,
        }
        await registered[0]!(
            {
                protocol: 'http',
                hostname: 'localhost',
                url: '/upup/health',
                method: 'GET',
                headers: {},
                body: undefined,
            },
            reply,
        )
        expect([sent['set-cookie']].flat()).toEqual(['only=1; Path=/'])
    })

    it('three cookies stay [c1, c2, c3], not [c1, c1, c2, c1, c2, c3]', async () => {
        respondWith.fn = () => {
            const res = new Response('{}', { status: 200 })
            for (const c of ['a=1; Path=/', 'b=2; Path=/', 'c=3; Path=/']) {
                res.headers.append('Set-Cookie', c)
            }
            return res
        }
        const registered: Array<
            (req: unknown, reply: unknown) => Promise<void>
        > = []
        await createUpupPlugin(config)({
            all: (_p: string, h: never) => {
                registered.push(h)
            },
        } as never)
        const sent: Record<string, string | string[]> = {}
        const reply = {
            code: () => reply,
            header: (k: string, v: string | string[]) => {
                fastifyLikeHeader(sent)(k, v)
                return reply
            },
            send: () => reply,
        }
        await registered[0]!(
            {
                protocol: 'http',
                hostname: 'localhost',
                url: '/upup/health',
                method: 'GET',
                headers: {},
                body: undefined,
            },
            reply,
        )
        expect(sent['set-cookie']).toEqual([
            'a=1; Path=/',
            'b=2; Path=/',
            'c=3; Path=/',
        ])
    })
})
