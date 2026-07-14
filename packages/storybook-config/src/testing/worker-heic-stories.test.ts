import { describe, it, expect } from 'vitest'
import { workerHeicArgs, workerHeicPlays } from './worker-heic-stories'

describe('workerHeic shared story specs', () => {
  it('every story sets autoUpload:true and sources local', () => {
    for (const key of ['heicConversion', 'webWorkerOffload', 'mainThreadFallback'] as const) {
      expect(workerHeicArgs[key].autoUpload).toBe(true)
      expect(workerHeicArgs[key].sources).toEqual(['local'])
    }
  })

  it('worker on/off is set per the story intent', () => {
    expect(workerHeicArgs.webWorkerOffload.webWorker).toBe(true)
    expect(workerHeicArgs.heicConversion.webWorker).toBe(false)
    expect(workerHeicArgs.mainThreadFallback.webWorker).toBe(false)
    expect(workerHeicArgs.heicConversion.heicConversion).toBe(true)
    expect(workerHeicArgs.mainThreadFallback.heicConversion).toBe(true)
  })

  it('exposes a play function per story', () => {
    expect(typeof workerHeicPlays.heicConversion).toBe('function')
    expect(typeof workerHeicPlays.webWorkerOffload).toBe('function')
    expect(typeof workerHeicPlays.mainThreadFallback).toBe('function')
  })
})
