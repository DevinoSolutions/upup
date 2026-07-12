// packages/server/tests/drive-clients.test.ts
// httpHeaderSafeJson — the Dropbox-API-Arg header must be ASCII/latin-1-safe so a
// unicode filename (Dropbox file ids ARE path strings) survives the HTTP header
// round trip. The live proof lives in tests/integration/
// drive-clients-live.integration.test.ts (a real dropbox download of the unicode
// fixture); this pins the header-escaping unit behavior with a fetch mock.
import { describe, it, expect, vi } from 'vitest'
import { getDriveClient, httpHeaderSafeJson } from '../src/drive-clients'

describe('httpHeaderSafeJson', () => {
    it('escapes every char >= 0x7F so the value is header-legal ASCII', () => {
        const out = httpHeaderSafeJson({ path: "/f/ünï 'q' & (1).txt" })
        // header-legal = every char <= 0x7E (the fn escapes 0x7F DEL too)
        expect([...out].every(ch => ch.charCodeAt(0) <= 0x7e)).toBe(true)
        expect(JSON.parse(out)).toEqual({ path: "/f/ünï 'q' & (1).txt" })
    })

    it('fetchDropboxFile sends a header-safe Dropbox-API-Arg for unicode paths', async () => {
        const captured: Record<string, string> = {}
        const fetchMock = vi.fn(async (_url: unknown, init?: RequestInit) => {
            Object.assign(
                captured,
                Object.fromEntries(new Headers(init?.headers).entries()),
            )
            return new Response(new Blob([new Uint8Array([1])]).stream(), {
                status: 200,
                headers: {
                    'Dropbox-API-Result': JSON.stringify({
                        name: 'x',
                        size: 1,
                    }),
                    'Content-Type': 'application/octet-stream',
                },
            })
        })
        vi.stubGlobal('fetch', fetchMock)
        try {
            await getDriveClient('dropbox').fetchFile('token', {
                fileId: "/f/ünï 'q'.txt",
            })
        } finally {
            vi.unstubAllGlobals()
        }
        const arg = captured['dropbox-api-arg']
        expect(arg).toBeDefined()
        expect([...arg!].every(ch => ch.charCodeAt(0) <= 0x7e)).toBe(true)
        expect(JSON.parse(arg!)).toEqual({ path: "/f/ünï 'q'.txt" })
    })
})
