import { describe, it, expect } from 'vitest'
import { WorkerPool } from '../src/worker-pool'

function toBuffer(str: string): ArrayBuffer {
    return new TextEncoder().encode(str).buffer as ArrayBuffer
}

// ─────────────────────────────────────────────
// hash-full
// ─────────────────────────────────────────────
describe('WorkerPool — hash-full', () => {
    it('returns a 64-character hex string', async () => {
        const pool = new WorkerPool()
        const result = await pool.execute<string>({ type: 'hash-full', data: toBuffer('hello') })
        expect(result).toHaveLength(64)
        expect(/^[0-9a-f]+$/.test(result)).toBe(true)
    })

    it('same input produces the same hash', async () => {
        const pool = new WorkerPool()
        const data = toBuffer('deterministic')
        const r1 = await pool.execute<string>({ type: 'hash-full', data })
        const r2 = await pool.execute<string>({ type: 'hash-full', data })
        expect(r1).toBe(r2)
    })

    it('different inputs produce different hashes', async () => {
        const pool = new WorkerPool()
        const r1 = await pool.execute<string>({ type: 'hash-full', data: toBuffer('abc') })
        const r2 = await pool.execute<string>({ type: 'hash-full', data: toBuffer('xyz') })
        expect(r1).not.toBe(r2)
    })

    it('empty buffer produces a valid hash', async () => {
        const pool = new WorkerPool()
        const result = await pool.execute<string>({ type: 'hash-full', data: new ArrayBuffer(0) })
        expect(result).toHaveLength(64)
    })
})

// ─────────────────────────────────────────────
// hash-partial
// ─────────────────────────────────────────────
describe('WorkerPool — hash-partial', () => {
    it('returns a 64-character hex string', async () => {
        const pool = new WorkerPool()
        const result = await pool.execute<string>({ type: 'hash-partial', data: toBuffer('hello partial') })
        expect(result).toHaveLength(64)
        expect(/^[0-9a-f]+$/.test(result)).toBe(true)
    })

    it('produces same result as hash-full for the same data', async () => {
        const pool = new WorkerPool()
        const data = toBuffer('shared content')
        const full = await pool.execute<string>({ type: 'hash-full', data })
        const partial = await pool.execute<string>({ type: 'hash-partial', data })
        expect(partial).toBe(full)
    })
})

// ─────────────────────────────────────────────
// gzip
// ─────────────────────────────────────────────
describe('WorkerPool — gzip', () => {
    it('result is an ArrayBuffer', async () => {
        const pool = new WorkerPool()
        const result = await pool.execute<ArrayBuffer>({ type: 'gzip', data: toBuffer('compress me') })
        expect(result).toBeInstanceOf(ArrayBuffer)
    })

    it('result has byte length > 0 for non-empty input', async () => {
        const pool = new WorkerPool()
        const result = await pool.execute<ArrayBuffer>({ type: 'gzip', data: toBuffer('data') })
        expect((result as ArrayBuffer).byteLength).toBeGreaterThan(0)
    })
})

// ─────────────────────────────────────────────
// error handling
// ─────────────────────────────────────────────
describe('WorkerPool — unknown task type', () => {
    it('throws for an unknown task type', async () => {
        const pool = new WorkerPool()
        await expect(
            pool.execute({ type: 'unknown-type' as any, data: toBuffer('x') })
        ).rejects.toThrow('Unknown worker task type')
    })
})

// ─────────────────────────────────────────────
// concurrent execution
// ─────────────────────────────────────────────
describe('WorkerPool — concurrent execution', () => {
    it('handles multiple parallel tasks without interference', async () => {
        const pool = new WorkerPool()
        const inputs = ['a', 'b', 'c', 'd', 'e']
        const results = await Promise.all(
            inputs.map(s => pool.execute<string>({ type: 'hash-full', data: toBuffer(s) }))
        )
        // All results are strings of length 64
        for (const r of results) {
            expect((r as string).length).toBe(64)
        }
        // All results are distinct (different inputs → different hashes)
        expect(new Set(results).size).toBe(inputs.length)
    })
})

// ─────────────────────────────────────────────
// destroy
// ─────────────────────────────────────────────
describe('WorkerPool — destroy', () => {
    it('can be called multiple times without throwing', () => {
        const pool = new WorkerPool()
        expect(() => {
            pool.destroy()
            pool.destroy()
        }).not.toThrow()
    })
})
