// src/msw/handlers.test.ts
import { describe, it, expect, afterEach, beforeAll, afterAll } from 'vitest'
import { setupServer } from 'msw/node'
import {
    uploadHandlers,
    uploadErrorHandlers,
    presignErrorHandlers,
    uploadSlowHandlers,
} from './handlers'

// Default to the success set; each error/latency describe overrides per test via
// `server.use()` (runtime handlers take precedence and are cleared afterEach).
const server = setupServer(...uploadHandlers)
beforeAll(() => server.listen())
afterEach(() => server.resetHandlers())
afterAll(() => server.close())

describe('uploadHandlers', () => {
    it('presign returns a usable object URL', async () => {
        const res = await fetch('https://example.test/api/upup-mock/presign', {
            method: 'POST',
            body: JSON.stringify({ name: 'My Photo.png' }),
        })
        const json = await res.json()
        expect(res.status).toBe(200)
        expect(json.key).toContain('mock/')
        expect(json.uploadUrl).toContain('/api/upup-mock/object/')
        expect(json.expiresIn).toBe(3600)
    })
    it('object PUT succeeds', async () => {
        const res = await fetch(
            'https://example.test/api/upup-mock/object/mock/x.png',
            {
                method: 'PUT',
                body: 'binary',
            },
        )
        expect(res.status).toBe(200)
    })
})

describe('uploadErrorHandlers', () => {
    it('presign still succeeds (failure is downstream)', async () => {
        server.use(...uploadErrorHandlers)
        const res = await fetch('https://example.test/api/upup-mock/presign', {
            method: 'POST',
            body: JSON.stringify({ name: 'x.png' }),
        })
        expect(res.status).toBe(200)
    })
    it('object PUT fails with 500', async () => {
        server.use(...uploadErrorHandlers)
        const res = await fetch(
            'https://example.test/api/upup-mock/object/mock/x.png',
            {
                method: 'PUT',
                body: 'binary',
            },
        )
        expect(res.status).toBe(500)
    })
})

describe('presignErrorHandlers', () => {
    it('presign fails with 500 (upload never starts)', async () => {
        server.use(...presignErrorHandlers)
        const res = await fetch('https://example.test/api/upup-mock/presign', {
            method: 'POST',
            body: JSON.stringify({ name: 'x.png' }),
        })
        expect(res.status).toBe(500)
    })
})

describe('uploadSlowHandlers', () => {
    it('object PUT succeeds only after the injected latency', async () => {
        server.use(...uploadSlowHandlers)
        const start = Date.now()
        const res = await fetch(
            'https://example.test/api/upup-mock/object/mock/x.png',
            {
                method: 'PUT',
                body: 'binary',
            },
        )
        const elapsed = Date.now() - start
        expect(res.status).toBe(200)
        // Injected delay is ~1500ms; a conservative lower bound avoids CI flake.
        expect(elapsed).toBeGreaterThanOrEqual(1000)
    })
})
