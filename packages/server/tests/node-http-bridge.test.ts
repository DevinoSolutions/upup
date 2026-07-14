import { describe, it, expect, vi } from 'vitest'
import {
    nodeHeadersToWeb,
    toWebRequest,
    writeWebResponse,
    type NodeResponseSink,
} from '../src/node-http-bridge'

// F-651 — express/fastify/pages-handler each hand-rolled the Node<->Web bridge and
// drifted: express/fastify copied ALL response headers (incl. content-length) and
// sent a `.text()` string; pages-handler skipped content-length (Node recomputes it
// from the payload -- a stale copy risks a mismatch) and sent a lossless Buffer.
// This pins the ONE correct behavior (pages-handler's) that the shared bridge adopts
// for all three call shapes.

describe('nodeHeadersToWeb', () => {
    it('converts a flat Record<string,string> to Headers', () => {
        const headers = nodeHeadersToWeb({
            'content-type': 'application/json',
            'x-custom': 'abc',
        })
        expect(headers.get('content-type')).toBe('application/json')
        expect(headers.get('x-custom')).toBe('abc')
    })

    it('appends (not overwrites) multi-value headers (string[])', () => {
        const headers = nodeHeadersToWeb({ 'set-cookie': ['a=1', 'b=2'] })
        expect(headers.get('set-cookie')).toBe('a=1, b=2')
    })

    it('skips undefined header values', () => {
        const headers = nodeHeadersToWeb({
            'x-present': 'yes',
            'x-absent': undefined,
        })
        expect(headers.get('x-present')).toBe('yes')
        expect(headers.has('x-absent')).toBe(false)
    })
})

describe('toWebRequest — table: express-style / fastify-style / next-style bodies bridge identically', () => {
    const table: Array<{ label: string; body: RequestInit['body'] }> = [
        {
            label: 'express-style (JSON.stringify(req.body))',
            body: JSON.stringify({ hello: 'world' }),
        },
        {
            label: 'fastify-style (same shape as express)',
            body: JSON.stringify({ a: 1 }),
        },
        {
            label: 'next-style (raw Buffer)',
            body: Buffer.from(JSON.stringify({ raw: true })),
        },
    ]

    for (const { label, body } of table) {
        it(`builds an identical Request shape for ${label}`, async () => {
            const req = toWebRequest({
                url: 'http://localhost:3000/upup/presign',
                method: 'POST',
                headers: {
                    'content-type': 'application/json',
                    authorization: 'Bearer x',
                },
                body,
            })
            expect(req.method).toBe('POST')
            expect(req.url).toBe('http://localhost:3000/upup/presign')
            expect(req.headers.get('content-type')).toBe('application/json')
            expect(req.headers.get('authorization')).toBe('Bearer x')
            const text = await req.text()
            expect(text.length).toBeGreaterThan(0)
        })
    }

    it('sends no body for GET requests regardless of a supplied body', async () => {
        const req = toWebRequest({
            url: 'http://localhost:3000/upup/health',
            method: 'GET',
            headers: {},
            body: JSON.stringify({ ignored: true }),
        })
        expect(req.method).toBe('GET')
        // A GET Request with a body throws when constructed in undici/Fetch --
        // toWebRequest's hasBody guard must have suppressed it before construction.
        const text = await req.text()
        expect(text).toBe('')
    })

    it('sends no body for HEAD requests', async () => {
        const req = toWebRequest({
            url: 'http://localhost:3000/x',
            method: 'HEAD',
            headers: {},
        })
        expect(req.method).toBe('HEAD')
    })
})

describe('writeWebResponse', () => {
    function makeSink() {
        return {
            status: vi.fn<NodeResponseSink['status']>(),
            setHeader: vi.fn<NodeResponseSink['setHeader']>(),
            send: vi.fn<NodeResponseSink['send']>(),
        }
    }

    it('writes the status code', async () => {
        const sink = makeSink()
        const webRes = new Response('{}', { status: 201 })
        await writeWebResponse(sink, webRes)
        expect(sink.status).toHaveBeenCalledWith(201)
    })

    it('copies response headers EXCEPT content-length (Node recomputes it -- a stale copy risks a mismatch)', async () => {
        const sink = makeSink()
        const webRes = new Response('hello world', {
            status: 200,
            headers: {
                'content-type': 'text/plain',
                'content-length': '999',
                'x-request-id': 'abc',
            },
        })
        await writeWebResponse(sink, webRes)
        const setHeaderCalls = sink.setHeader.mock.calls.map(c =>
            c[0].toLowerCase(),
        )
        expect(setHeaderCalls).toContain('content-type')
        expect(setHeaderCalls).toContain('x-request-id')
        expect(setHeaderCalls).not.toContain('content-length')
    })

    it('sends the body as a lossless Buffer, not a .text() string', async () => {
        const sink = makeSink()
        const payload = JSON.stringify({ key: 'value', num: 42 })
        const webRes = new Response(payload, { status: 200 })
        await writeWebResponse(sink, webRes)
        expect(sink.send).toHaveBeenCalledTimes(1)
        const sentBody = sink.send.mock.calls[0]![0]
        expect(Buffer.isBuffer(sentBody)).toBe(true)
        expect(sentBody.toString('utf8')).toBe(payload)
    })

    it('round-trips binary content losslessly (not just text)', async () => {
        const sink = makeSink()
        const bytes = new Uint8Array([0, 1, 2, 255, 254, 253])
        const webRes = new Response(bytes, { status: 200 })
        await writeWebResponse(sink, webRes)
        const sentBody = sink.send.mock.calls[0]![0]
        expect(Buffer.isBuffer(sentBody)).toBe(true)
        expect(Uint8Array.from(sentBody)).toEqual(bytes)
    })
})
