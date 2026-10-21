// packages/server/tests/adapter-multi-cookie.test.ts
//
// T-5698: a response carrying SEVERAL Set-Cookie headers must reach the client
// intact through the Fastify adapter. `Headers.forEach` comma-joins them and a
// replacing `reply.header(k, v)` keeps only the last, so the adapter has to
// hand the bridge an appending sink (the Express and Next Pages adapters have
// their own tests: adapters.test.ts and @useupup/next's pages-handler.spec.ts).
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

describe('Fastify adapter: multiple Set-Cookie headers (T-5698)', () => {
    it('delivers every cookie, as a list, to a reply whose header() REPLACES', async () => {
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
            // Replacing semantics, like a plain object / generic header setter.
            header: (k: string, v: string | string[]) => {
                sent[k.toLowerCase()] = v
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
                sent[k.toLowerCase()] = v
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
})
