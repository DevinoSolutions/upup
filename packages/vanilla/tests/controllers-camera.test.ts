import { describe, it, expect, vi, beforeEach } from 'vitest'
import { CameraController } from '../src/controllers/camera'

function mockMedia() {
  const track = { stop: vi.fn() }
  const stream = { getTracks: () => [track] } as unknown as MediaStream
  ;(navigator as any).mediaDevices = { getUserMedia: vi.fn(async () => stream) }
  return { track, stream }
}

beforeEach(() => { vi.restoreAllMocks() })

describe('CameraController', () => {
  it('starts and stops the camera, stopping all tracks on dispose', async () => {
    const { track } = mockMedia()
    const c = new CameraController({ core: { emit: vi.fn() } as any, setFiles: vi.fn(async () => {}), setActiveSource: vi.fn(), invalidate: vi.fn() })
    c.activate()
    await c.startCamera()
    c.dispose()
    expect(track.stop).toHaveBeenCalled()
  })
  it('toggles facing mode', () => {
    mockMedia()
    const c = new CameraController({ core: { emit: vi.fn() } as any, setFiles: vi.fn(async () => {}), setActiveSource: vi.fn(), invalidate: vi.fn() })
    const before = c.getSnapshot().facingMode
    c.handleCameraSwitch()
    expect(c.getSnapshot().facingMode).not.toBe(before)
  })
  it('disposed-guard: a stream resolving after dispose() is stopped, no post-dispose invalidate', async () => {
    // getUserMedia stays pending until we resolve it, so we can interleave dispose() mid-flight.
    const track = { stop: vi.fn() }
    const lateStream = { getTracks: () => [track] } as unknown as MediaStream
    let resolveGum!: (s: MediaStream) => void
    ;(navigator as any).mediaDevices = { getUserMedia: vi.fn(() => new Promise<MediaStream>((r) => { resolveGum = r })) }
    const invalidate = vi.fn()
    const c = new CameraController({ core: { emit: vi.fn() } as any, setFiles: vi.fn(async () => {}), setActiveSource: vi.fn(), invalidate })
    const pending = c.startCamera()            // awaits getUserMedia (still pending)
    c.dispose()                                // tear down BEFORE the stream resolves
    const invalidatesAtDispose = invalidate.mock.calls.length
    resolveGum(lateStream)                      // now the late stream arrives
    await pending
    expect(track.stop).toHaveBeenCalled()       // late stream's tracks stopped (no leak)
    expect(invalidate.mock.calls.length).toBe(invalidatesAtDispose) // guard skipped the success path
    expect(c.getSnapshot().capturedUrl).toBe('')
  })
})
