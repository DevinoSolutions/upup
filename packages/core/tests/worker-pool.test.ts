import { describe, it, expect, vi } from 'vitest'
import { WorkerPool, type WorkerTask } from '../src/worker-pool'

// In Node/Vitest environment, Worker is not available.
// WorkerPool should fall back to main-thread execution.

describe('WorkerPool', () => {
  it('falls back to main thread when Worker is unavailable', async () => {
    const pool = new WorkerPool()
    const data = new TextEncoder().encode('hello world').buffer

    const result = await pool.execute({ type: 'hash-full', data: data as ArrayBuffer })

    expect(typeof result).toBe('string')
    expect((result as string).length).toBe(64) // SHA-256 hex
  })

  it('handles gzip tasks on main thread', async () => {
    const pool = new WorkerPool()
    const data = new TextEncoder().encode('hello world').buffer

    // Gzip fallback returns the original data when CompressionStream is not available
    const result = await pool.execute({ type: 'gzip', data: data as ArrayBuffer })

    expect(result).toBeInstanceOf(ArrayBuffer)
  })

  it('destroys without errors', () => {
    const pool = new WorkerPool()
    expect(() => pool.destroy()).not.toThrow()
  })
})
