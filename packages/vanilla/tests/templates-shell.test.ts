import { describe, it, expect, beforeEach } from 'vitest'
import { createUploader } from '../src/create-uploader'

beforeEach(() => { document.body.innerHTML = '' })

describe('shell templates', () => {
  it('renders the dropzone + adapter selector tiles for local source', () => {
    const host = document.createElement('div'); document.body.appendChild(host)
    const up = createUploader(host, { sources: ['local', 'link', 'camera'] })
    expect(host.querySelector('[data-testid="upup-dropzone"]')).toBeTruthy()
    expect(host.querySelector('[data-upup-slot="adapter-selector"]')).toBeTruthy()
    expect(host.querySelector('[data-testid="upup-browse-files"]')).toBeTruthy()
    expect(host.querySelector('[data-testid="upup-source-link"]')).toBeTruthy()
    expect(host.querySelector('[data-testid="upup-source-camera"]')).toBeTruthy()
    up.destroy()
  })
})
