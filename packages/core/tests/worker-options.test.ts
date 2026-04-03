import { describe, it, expect } from 'vitest'
import { UpupCore } from '../src/core'

describe('CoreOptions worker options', () => {
  it('should accept enableWorkers option', () => {
    const core = new UpupCore({
      enableWorkers: true,
    })
    expect(core.options.enableWorkers).toBe(true)
    core.destroy()
  })

  it('should accept workerPoolSize option', () => {
    const core = new UpupCore({
      enableWorkers: true,
      workerPoolSize: 4,
    })
    expect(core.options.workerPoolSize).toBe(4)
    core.destroy()
  })

  it('should default enableWorkers to false', () => {
    const core = new UpupCore({})
    expect(core.options.enableWorkers).toBeUndefined()
    core.destroy()
  })

  it('should create WorkerPool when enableWorkers is true', () => {
    const core = new UpupCore({
      enableWorkers: true,
      workerPoolSize: 2,
    })
    expect((core as any).workerPool).toBeDefined()
    core.destroy()
  })

  it('should not create WorkerPool when enableWorkers is false', () => {
    const core = new UpupCore({})
    expect((core as any).workerPool).toBeUndefined()
    core.destroy()
  })

  it('should destroy WorkerPool on core.destroy()', () => {
    const core = new UpupCore({
      enableWorkers: true,
    })
    const pool = (core as any).workerPool
    expect(pool).toBeDefined()
    core.destroy()
    // After destroy, workers array should be empty
    expect(pool.workers).toEqual([])
  })
})
