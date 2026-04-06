import { describe, it, expect } from 'vitest'
import { BrowserRuntime } from '../src/runtime/browser'

// ─────────────────────────────────────────────
// computeHash
// ─────────────────────────────────────────────
describe('BrowserRuntime — computeHash', () => {
    it('returns a 64-character lowercase hex string', async () => {
        const buf = new TextEncoder().encode('hello').buffer as ArrayBuffer
        const result = await BrowserRuntime.computeHash(buf)
        expect(result).toHaveLength(64)
        expect(/^[0-9a-f]+$/.test(result)).toBe(true)
    })

    it('is deterministic for the same input', async () => {
        const buf = new TextEncoder().encode('deterministic').buffer as ArrayBuffer
        const r1 = await BrowserRuntime.computeHash(buf)
        const r2 = await BrowserRuntime.computeHash(buf)
        expect(r1).toBe(r2)
    })

    it('produces different hashes for different inputs', async () => {
        const encode = (s: string) => new TextEncoder().encode(s).buffer as ArrayBuffer
        const r1 = await BrowserRuntime.computeHash(encode('foo'))
        const r2 = await BrowserRuntime.computeHash(encode('bar'))
        expect(r1).not.toBe(r2)
    })

    it('handles an empty buffer', async () => {
        const result = await BrowserRuntime.computeHash(new ArrayBuffer(0))
        expect(result).toHaveLength(64)
    })
})

// ─────────────────────────────────────────────
// readAsArrayBuffer
// ─────────────────────────────────────────────
describe('BrowserRuntime — readAsArrayBuffer', () => {
    it('returns an ArrayBuffer for a File', async () => {
        const file = new File(['hello world'], 'test.txt', { type: 'text/plain' })
        const result = await BrowserRuntime.readAsArrayBuffer(file)
        expect(result).toBeInstanceOf(ArrayBuffer)
    })

    it('byte length matches the source file size', async () => {
        const content = 'abcde'
        const file = new File([content], 'test.txt', { type: 'text/plain' })
        const result = await BrowserRuntime.readAsArrayBuffer(file)
        expect(result.byteLength).toBe(content.length)
    })

    it('returns an ArrayBuffer for a Blob', async () => {
        const blob = new Blob(['binary data'])
        const result = await BrowserRuntime.readAsArrayBuffer(blob)
        expect(result).toBeInstanceOf(ArrayBuffer)
        expect(result.byteLength).toBeGreaterThan(0)
    })
})

// ─────────────────────────────────────────────
// createObjectURL / revokeObjectURL
// ─────────────────────────────────────────────
describe('BrowserRuntime — URL helpers', () => {
    it('createObjectURL is defined when URL.createObjectURL is available', () => {
        if (typeof URL !== 'undefined' && URL.createObjectURL) {
            expect(BrowserRuntime.createObjectURL).toBeDefined()
            expect(typeof BrowserRuntime.createObjectURL).toBe('function')
        } else {
            expect(BrowserRuntime.createObjectURL).toBeUndefined()
        }
    })

    it('revokeObjectURL is defined when URL.revokeObjectURL is available', () => {
        if (typeof URL !== 'undefined' && URL.revokeObjectURL) {
            expect(BrowserRuntime.revokeObjectURL).toBeDefined()
            expect(typeof BrowserRuntime.revokeObjectURL).toBe('function')
        } else {
            expect(BrowserRuntime.revokeObjectURL).toBeUndefined()
        }
    })
})

// ─────────────────────────────────────────────
// PipelineEngine.processAll
// ─────────────────────────────────────────────
describe('BrowserRuntime — computeHash round-trip with readAsArrayBuffer', () => {
    it('file contents are preserved end-to-end through hash computation', async () => {
        const content = 'round-trip test content'
        const file = new File([content], 'rt.txt', { type: 'text/plain' })
        const buf = await BrowserRuntime.readAsArrayBuffer(file)
        const hash = await BrowserRuntime.computeHash(buf)
        expect(hash).toHaveLength(64)
        // Same content → same hash on second pass
        const buf2 = await BrowserRuntime.readAsArrayBuffer(new File([content], 'rt2.txt'))
        const hash2 = await BrowserRuntime.computeHash(buf2)
        expect(hash).toBe(hash2)
    })
})
