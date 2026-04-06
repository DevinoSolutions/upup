import { describe, it, expect, vi, afterEach } from 'vitest'
import { BrowserRuntime } from '../../src/runtime/browser'

// ─────────────────────────────────────────────
// Shape / interface conformance
// ─────────────────────────────────────────────
describe('BrowserRuntime — shape', () => {
    it('has a computeHash method', () => {
        expect(typeof BrowserRuntime.computeHash).toBe('function')
    })

    it('has an upload method', () => {
        expect(typeof BrowserRuntime.upload).toBe('function')
    })

    it('has a readAsArrayBuffer method', () => {
        expect(typeof BrowserRuntime.readAsArrayBuffer).toBe('function')
    })

    it('createObjectURL is a function or undefined (browser-only)', () => {
        expect(
            BrowserRuntime.createObjectURL === undefined ||
            typeof BrowserRuntime.createObjectURL === 'function',
        ).toBe(true)
    })

    it('revokeObjectURL is a function or undefined (browser-only)', () => {
        expect(
            BrowserRuntime.revokeObjectURL === undefined ||
            typeof BrowserRuntime.revokeObjectURL === 'function',
        ).toBe(true)
    })

    it('createImageBitmap is a function or undefined', () => {
        expect(
            BrowserRuntime.createImageBitmap === undefined ||
            typeof BrowserRuntime.createImageBitmap === 'function',
        ).toBe(true)
    })

    it('createWorker is a function or undefined', () => {
        expect(
            BrowserRuntime.createWorker === undefined ||
            typeof BrowserRuntime.createWorker === 'function',
        ).toBe(true)
    })
})

// ─────────────────────────────────────────────
// computeHash
// ─────────────────────────────────────────────
describe('BrowserRuntime — computeHash', () => {
    it('returns a hex string', async () => {
        const buf = new TextEncoder().encode('hello').buffer
        const hash = await BrowserRuntime.computeHash(buf)
        expect(typeof hash).toBe('string')
        expect(hash).toMatch(/^[0-9a-f]+$/)
    })

    it('returns a 64-character SHA-256 hex digest', async () => {
        const buf = new TextEncoder().encode('hello world').buffer
        const hash = await BrowserRuntime.computeHash(buf)
        expect(hash).toHaveLength(64)
    })

    it('produces the known SHA-256 of an empty buffer', async () => {
        // SHA-256("") = e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855
        const hash = await BrowserRuntime.computeHash(new ArrayBuffer(0))
        expect(hash).toBe('e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855')
    })

    it('is deterministic — same input yields same hash', async () => {
        const buf = new TextEncoder().encode('determinism').buffer
        const [a, b] = await Promise.all([
            BrowserRuntime.computeHash(buf),
            BrowserRuntime.computeHash(buf),
        ])
        expect(a).toBe(b)
    })

    it('different inputs produce different hashes', async () => {
        const a = await BrowserRuntime.computeHash(new TextEncoder().encode('foo').buffer)
        const b = await BrowserRuntime.computeHash(new TextEncoder().encode('bar').buffer)
        expect(a).not.toBe(b)
    })
})

// ─────────────────────────────────────────────
// readAsArrayBuffer
// ─────────────────────────────────────────────
describe('BrowserRuntime — readAsArrayBuffer', () => {
    it('returns an ArrayBuffer', async () => {
        const blob = new Blob(['hello'])
        const result = await BrowserRuntime.readAsArrayBuffer(blob)
        expect(result).toBeInstanceOf(ArrayBuffer)
    })

    it('buffer has the correct byte length', async () => {
        const blob = new Blob(['hello'])
        const result = await BrowserRuntime.readAsArrayBuffer(blob)
        expect(result.byteLength).toBe(5)
    })

    it('reads a File correctly', async () => {
        const file = new File(['test data'], 'test.txt', { type: 'text/plain' })
        const result = await BrowserRuntime.readAsArrayBuffer(file)
        expect(result.byteLength).toBe(9)
    })

    it('reads an empty blob as a zero-length ArrayBuffer', async () => {
        const blob = new Blob([])
        const result = await BrowserRuntime.readAsArrayBuffer(blob)
        expect(result.byteLength).toBe(0)
    })

    it('content matches the original bytes', async () => {
        const blob = new Blob([new Uint8Array([1, 2, 3, 4])])
        const result = await BrowserRuntime.readAsArrayBuffer(blob)
        expect(new Uint8Array(result)).toEqual(new Uint8Array([1, 2, 3, 4]))
    })
})

// ─────────────────────────────────────────────
// createObjectURL / revokeObjectURL (stubbed)
// ─────────────────────────────────────────────
describe('BrowserRuntime — createObjectURL / revokeObjectURL', () => {
    afterEach(() => {
        vi.restoreAllMocks()
    })

    it('createObjectURL delegates to URL.createObjectURL when available', () => {
        if (!BrowserRuntime.createObjectURL) return
        const stub = vi.spyOn(URL, 'createObjectURL').mockReturnValue('blob:test-url')
        const blob = new Blob(['data'])
        const result = BrowserRuntime.createObjectURL(blob)
        expect(stub).toHaveBeenCalledWith(blob)
        expect(result).toBe('blob:test-url')
    })

    it('revokeObjectURL delegates to URL.revokeObjectURL when available', () => {
        if (!BrowserRuntime.revokeObjectURL) return
        const stub = vi.spyOn(URL, 'revokeObjectURL').mockImplementation(() => {})
        BrowserRuntime.revokeObjectURL('blob:test-url')
        expect(stub).toHaveBeenCalledWith('blob:test-url')
    })
})
