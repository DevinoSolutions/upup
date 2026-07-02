import { describe, it, expect, vi, beforeEach } from 'vitest'
import { AudioRecorderController } from '../src/controllers/audio-recorder'

class FakeRecorder {
  mimeType = 'audio/webm'
  state = 'inactive'
  ondataavailable: ((e: { data: Blob }) => void) | null = null
  onstop: (() => void) | null = null
  constructor(public stream: MediaStream) {}
  start() { this.state = 'recording' }
  stop() { this.state = 'inactive'; this.ondataavailable?.({ data: new Blob(['x']) }); this.onstop?.() }
}

beforeEach(() => {
  vi.restoreAllMocks()
  ;(navigator as any).mediaDevices = { getUserMedia: vi.fn(async () => ({ getTracks: () => [{ stop: vi.fn() }] } as unknown as MediaStream)) }
  vi.stubGlobal('MediaRecorder', FakeRecorder as unknown as typeof MediaRecorder)
  vi.stubGlobal('URL', { ...URL, createObjectURL: vi.fn(() => 'blob:audio'), revokeObjectURL: vi.fn() })
})

describe('AudioRecorderController', () => {
  it('transitions idle -> recording -> recorded', async () => {
    const c = new AudioRecorderController({ setFiles: vi.fn(async () => {}), setActiveSource: vi.fn(), invalidate: vi.fn() })
    expect(c.getSnapshot().recordingState).toBe('idle')
    await c.startRecording()
    expect(c.getSnapshot().recordingState).toBe('recording')
    c.stopRecording()
    expect(c.getSnapshot().recordingState).toBe('recorded')
    c.destroy()
  })
  it('destroyed-guard: a mic stream resolving after destroy() is stopped, no timer/invalidate', async () => {
    const track = { stop: vi.fn() }
    const lateStream = { getTracks: () => [track] } as unknown as MediaStream
    let resolveGum!: (s: MediaStream) => void
    ;(navigator as any).mediaDevices = { getUserMedia: vi.fn(() => new Promise<MediaStream>((r) => { resolveGum = r })) }
    const invalidate = vi.fn()
    const c = new AudioRecorderController({ setFiles: vi.fn(async () => {}), setActiveSource: vi.fn(), invalidate })
    const pending = c.startRecording()
    c.destroy()
    const at = invalidate.mock.calls.length
    resolveGum(lateStream)
    await pending
    expect(track.stop).toHaveBeenCalled()
    expect(invalidate.mock.calls.length).toBe(at)
    expect(c.getSnapshot().recordingState).toBe('idle')
  })
})
