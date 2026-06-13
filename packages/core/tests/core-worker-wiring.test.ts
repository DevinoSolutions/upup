import { describe, it, expect } from 'vitest'
import { UpupCore } from '../src/core'

describe('core worker wiring (headless / node)', () => {
  it('accepts the webWorker option without affecting headless processing', async () => {
    const core = new UpupCore({ checksumVerification: true, webWorker: false })
    const f = new File(['hello'], 'a.txt', { type: 'text/plain' })
    await core.setFiles([f])
    try { await core.upload() } catch { /* no endpoint — expected */ }
    const processed = [...core.files.values()][0]
    expect(processed.checksumSHA256).toBeDefined()
    expect(processed.checksumSHA256!.length).toBe(64)
    core.destroy()
  })

  it('runs the pipeline on the main thread when workers are unavailable (default auto)', async () => {
    const core = new UpupCore({ checksumVerification: true })
    await core.setFiles([new File(['data'], 'b.txt', { type: 'text/plain' })])
    try { await core.upload() } catch { /* expected */ }
    expect([...core.files.values()][0].checksumSHA256).toBeDefined()
    core.destroy()
  })

  it('exposes webWorker on CoreOptions type', () => {
    const core = new UpupCore({ webWorker: true })
    expect(core.options.webWorker).toBe(true)
    core.destroy()
  })
})
