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
    const c = new CameraController({ core: { emit: vi.fn() } as any, setFiles: vi.fn(async () => {}), setActiveAdapter: vi.fn(), invalidate: vi.fn() })
    c.activate()
    await c.startCamera()
    c.dispose()
    expect(track.stop).toHaveBeenCalled()
  })
  it('toggles facing mode', () => {
    mockMedia()
    const c = new CameraController({ core: { emit: vi.fn() } as any, setFiles: vi.fn(async () => {}), setActiveAdapter: vi.fn(), invalidate: vi.fn() })
    const before = c.getSnapshot().facingMode
    c.handleCameraSwitch()
    expect(c.getSnapshot().facingMode).not.toBe(before)
  })
})
