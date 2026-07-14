import { describe, it, expect } from 'vitest'
import { normalizeRequestOrigin, resolveOrigin } from '../src/normalize-origin'

describe('resolveOrigin', () => {
    it('returns the origin of an explicit baseUrl', () => {
        const req = new Request('https://internal.local/api/upup/presign')
        expect(resolveOrigin(req, { baseUrl: 'https://app.example.com' })).toBe(
            'https://app.example.com',
        )
    })

    it('builds the origin from x-forwarded-* when trustProxy is set', () => {
        const req = new Request('http://10.0.0.1/api/upup/auth/google-drive', {
            headers: {
                'x-forwarded-host': 'app.example.com',
                'x-forwarded-proto': 'https',
            },
        })
        expect(resolveOrigin(req, { trustProxy: true })).toBe(
            'https://app.example.com',
        )
    })

    it('defaults to https when trustProxy host is set but proto is missing', () => {
        const req = new Request('http://10.0.0.1/api/upup', {
            headers: { 'x-forwarded-host': 'app.example.com' },
        })
        expect(resolveOrigin(req, { trustProxy: true })).toBe(
            'https://app.example.com',
        )
    })

    it('ignores x-forwarded-* when trustProxy is not set (default)', () => {
        const req = new Request('http://10.0.0.1/api/upup', {
            headers: { 'x-forwarded-host': 'evil.example.com' },
        })
        expect(resolveOrigin(req)).toBeNull()
    })
})

describe('normalizeRequestOrigin', () => {
    it('rewrites the origin while preserving path, query, method, and body', async () => {
        const req = new Request('https://internal.local/api/upup/presign?x=1', {
            method: 'POST',
            headers: { 'content-type': 'application/json' },
            body: JSON.stringify({
                name: 'a.png',
                size: 10,
                type: 'image/png',
            }),
        })
        const out = normalizeRequestOrigin(req, {
            baseUrl: 'https://app.example.com',
        })
        expect(out).not.toBe(req)
        const url = new URL(out.url)
        expect(url.origin).toBe('https://app.example.com')
        expect(url.pathname).toBe('/api/upup/presign')
        expect(url.search).toBe('?x=1')
        expect(out.method).toBe('POST')
        expect(await out.json()).toEqual({
            name: 'a.png',
            size: 10,
            type: 'image/png',
        })
    })

    it('returns the SAME request when the origin already matches', () => {
        const req = new Request('https://app.example.com/api/upup/presign')
        const out = normalizeRequestOrigin(req, {
            baseUrl: 'https://app.example.com',
        })
        expect(out).toBe(req)
    })

    it('returns the SAME request when no override applies', () => {
        const req = new Request('https://app.example.com/api/upup')
        expect(normalizeRequestOrigin(req)).toBe(req)
    })
})
