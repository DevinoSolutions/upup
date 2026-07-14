import { describe, it, expect } from 'vitest'
import { installWorkerProbe, getWorkerSpawnCount, resetWorkerProbe } from './worker-probe'

describe('worker-probe', () => {
  it('counts constructions on the injected target and restores it', () => {
    class FakeWorker {
      url: unknown
      constructor(u: unknown) {
        this.url = u
      }
    }
    const target = { Worker: FakeWorker as unknown }
    installWorkerProbe(target)
    expect(getWorkerSpawnCount()).toBe(0)
    const w = new (target.Worker as typeof FakeWorker)('x') as FakeWorker
    expect(getWorkerSpawnCount()).toBe(1)
    expect(w).toBeInstanceOf(FakeWorker)
    expect(w.url).toBe('x')
    resetWorkerProbe()
    expect(target.Worker).toBe(FakeWorker)
  })

  it('install is idempotent and resets the count to 0', () => {
    class FakeWorker {}
    const target = { Worker: FakeWorker as unknown }
    installWorkerProbe(target)
    new (target.Worker as typeof FakeWorker)()
    expect(getWorkerSpawnCount()).toBe(1)
    installWorkerProbe(target) // re-install must restore-then-rewrap, count → 0
    expect(getWorkerSpawnCount()).toBe(0)
    expect(target.Worker).not.toBe(FakeWorker) // wrapped again
    resetWorkerProbe()
    expect(target.Worker).toBe(FakeWorker) // original restored
  })
})
