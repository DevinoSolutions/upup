import { describe, it, expect } from 'vitest'
import { isWorkerEligible } from '../../src/worker/eligibility'

describe('isWorkerEligible', () => {
  it('is true when auto (unset), worker supported, and pipeline non-empty', () => {
    expect(isWorkerEligible({}, true, 3)).toBe(true)
    expect(isWorkerEligible({ webWorker: true }, true, 1)).toBe(true)
  })
  it('is false when explicitly disabled', () => {
    expect(isWorkerEligible({ webWorker: false }, true, 3)).toBe(false)
  })
  it('is false when Worker is unsupported', () => {
    expect(isWorkerEligible({}, false, 3)).toBe(false)
  })
  it('is false when there are no steps to offload', () => {
    expect(isWorkerEligible({}, true, 0)).toBe(false)
  })
})
