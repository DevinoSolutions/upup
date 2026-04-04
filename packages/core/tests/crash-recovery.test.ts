import { describe, it, expect, vi } from 'vitest'
import { CrashRecoveryManager } from '../src/crash-recovery'

// Mock IndexedDB with a simple in-memory store
const mockStorage = {
  store: new Map<string, unknown>(),
  get: vi.fn(async (key: string) => mockStorage.store.get(key)),
  set: vi.fn(async (key: string, value: unknown) => { mockStorage.store.set(key, value) }),
  delete: vi.fn(async (key: string) => { mockStorage.store.delete(key) }),
}

describe('CrashRecoveryManager', () => {
  it('saves a snapshot', async () => {
    const manager = new CrashRecoveryManager(mockStorage)
    const snapshot = { files: [['id1', { name: 'test.jpg' }]], status: 'UPLOADING' }

    await manager.save(snapshot)

    expect(mockStorage.set).toHaveBeenCalledWith('upup-crash-recovery', snapshot)
  })

  it('restores a snapshot', async () => {
    const snapshot = { files: [['id1', { name: 'test.jpg' }]], status: 'UPLOADING' }
    mockStorage.store.set('upup-crash-recovery', snapshot)

    const manager = new CrashRecoveryManager(mockStorage)
    const restored = await manager.restore()

    expect(restored).toEqual(snapshot)
  })

  it('returns null when no snapshot exists', async () => {
    mockStorage.store.clear()
    const manager = new CrashRecoveryManager(mockStorage)
    const restored = await manager.restore()

    expect(restored).toBeNull()
  })

  it('clears the snapshot', async () => {
    mockStorage.store.set('upup-crash-recovery', { data: true })
    const manager = new CrashRecoveryManager(mockStorage)

    await manager.clear()

    expect(mockStorage.delete).toHaveBeenCalledWith('upup-crash-recovery')
  })
})
