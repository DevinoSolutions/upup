import { describe, it, expect, beforeEach } from 'vitest'
import { createUploader } from '../src/create-uploader'

beforeEach(() => { document.body.innerHTML = '' })

describe('drive views', () => {
  it('mounts without throwing when a cloud drive source is configured', () => {
    const host = document.createElement('div'); document.body.appendChild(host)
    const up = createUploader(host, {
      sources: ['googleDrive'],
      cloudDrives: { googleDrive: { clientId: 'x', apiKey: 'y', appId: 'z' } },
    })
    expect(host.querySelector('[data-testid="upup-root"]')).toBeTruthy()
    up.destroy()
  })
})
