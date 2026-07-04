import { describe, it, expect, vi, beforeEach } from 'vitest'
import { Readable } from 'node:stream'

// Capture the Web Request the core handler receives, and control its Response.
const received: { req?: Request } = {}
let respond: (req: Request) => Promise<Response>

vi.mock('@upup/server', () => ({
    createUpupHandler: () => async (req: Request) => {
        received.req = req
        return respond(req)
    },
}))

import { createUpupPagesHandler } from '../pages-handler'

function mockReq(opts: {
    method: string
    url: string
    headers?: Record<string, string>
    body?: string
}) {
    const stream = Readable.from(opts.body ? [Buffer.from(opts.body)] : [])
    const req = stream as unknown as import('next').NextApiRequest
    req.method = opts.method
    req.url = opts.url
    req.headers = { host: 'localhost:3000', ...(opts.headers ?? {}) }
    return req
}

function mockRes() {
    const res: any = {
        statusCode: 0,
        headers: {} as Record<string, string>,
        body: undefined as unknown,
        status: vi.fn(function (this: any, c: number) {
            this.statusCode = c
            return this
        }),
        setHeader: vi.fn(function (this: any, k: string, v: string) {
            this.headers[k.toLowerCase()] = v
        }),
        send: vi.fn(function (this: any, b: unknown) {
            this.body = b
        }),
        json: vi.fn(function (this: any, b: unknown) {
            this.body = b
        }),
        end: vi.fn(),
    }
    return res
}

beforeEach(() => {
    received.req = undefined
    respond = async () => new Response('{}', { status: 200 })
})

describe('createUpupPagesHandler', () => {
    it('bridges a POST body to the core Web Request and maps the JSON response', async () => {
        respond = async () =>
            new Response(JSON.stringify({ url: 'https://s3/put' }), {
                status: 200,
                headers: { 'content-type': 'application/json' },
            })
        const handler = createUpupPagesHandler({} as any)
        const req = mockReq({
            method: 'POST',
            url: '/api/upup-pages/presign',
            headers: { 'content-type': 'application/json' },
            body: JSON.stringify({ name: 'a.png', size: 1, type: 'image/png' }),
        })
        const res = mockRes()
        await handler(req, res)

        expect(received.req?.method).toBe('POST')
        expect(new URL(received.req!.url).pathname).toBe(
            '/api/upup-pages/presign',
        )
        expect(await received.req!.json()).toEqual({
            name: 'a.png',
            size: 1,
            type: 'image/png',
        })
        expect(res.statusCode).toBe(200)
        expect(Buffer.isBuffer(res.body)).toBe(true)
        expect(JSON.parse((res.body as Buffer).toString())).toEqual({
            url: 'https://s3/put',
        })
    })

    it('does not read a body for GET', async () => {
        const handler = createUpupPagesHandler({} as any)
        const req = mockReq({
            method: 'GET',
            url: '/api/upup-pages/files/google-drive',
        })
        const res = mockRes()
        await handler(req, res)
        expect(received.req?.method).toBe('GET')
        expect(received.req?.body).toBeNull()
    })

    it('preserves a redirect (3xx + Location) for OAuth', async () => {
        respond = async () =>
            new Response(null, {
                status: 302,
                headers: { location: 'https://accounts.google.com/o' },
            })
        const handler = createUpupPagesHandler({} as any)
        const res = mockRes()
        await handler(
            mockReq({
                method: 'GET',
                url: '/api/upup-pages/auth/google-drive',
            }),
            res,
        )
        expect(res.statusCode).toBe(302)
        expect(res.headers['location']).toBe('https://accounts.google.com/o')
    })

    it('maps a thrown error to a 500 JSON response', async () => {
        respond = async () => {
            throw new Error('boom')
        }
        const handler = createUpupPagesHandler({} as any)
        const res = mockRes()
        await handler(
            mockReq({
                method: 'POST',
                url: '/api/upup-pages/presign',
                body: '{}',
            }),
            res,
        )
        expect(res.statusCode).toBe(500)
        expect(res.body).toEqual({ error: 'boom' })
    })

    it('passes binary response bytes through intact', async () => {
        const bytes = new Uint8Array([0, 1, 2, 250, 255])
        respond = async () => new Response(bytes, { status: 200 })
        const handler = createUpupPagesHandler({} as any)
        const res = mockRes()
        await handler(mockReq({ method: 'GET', url: '/api/upup-pages/x' }), res)
        expect(Array.from(res.body as Buffer)).toEqual([0, 1, 2, 250, 255])
    })

    it('uses an explicit baseUrl for the Web Request origin', async () => {
        const handler = createUpupPagesHandler({} as any, {
            baseUrl: 'https://app.example.com',
        })
        await handler(
            mockReq({ method: 'GET', url: '/api/upup-pages/x' }),
            mockRes(),
        )
        expect(new URL(received.req!.url).origin).toBe(
            'https://app.example.com',
        )
    })

    it('derives the origin from the first x-forwarded-* value when trustProxy is set', async () => {
        const handler = createUpupPagesHandler({} as any, { trustProxy: true })
        await handler(
            mockReq({
                method: 'GET',
                url: '/api/upup-pages/auth/google-drive',
                headers: {
                    'x-forwarded-host': 'app.example.com, edge.cdn',
                    'x-forwarded-proto': 'https',
                },
            }),
            mockRes(),
        )
        expect(new URL(received.req!.url).origin).toBe(
            'https://app.example.com',
        )
    })
})
