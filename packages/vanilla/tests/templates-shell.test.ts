import { describe, it, expect, beforeEach } from 'vitest'
import { createUploader } from '../src/create-uploader'

beforeEach(() => { document.body.innerHTML = '' })

describe('shell templates', () => {
  it('renders the dropzone + adapter selector tiles for local source', () => {
    const host = document.createElement('div'); document.body.appendChild(host)
    // NOTE: 'link' is not a valid UploadSource string; the correct value is 'url' (= FileSource.URL).
    // normalizeSource('link') returns undefined and the tile is never rendered.
    // The data-testid uses the FileSource enum value: 'url' → 'upup-source-url'.
    const up = createUploader(host, { sources: ['local', 'url', 'camera'] })
    expect(host.querySelector('[data-testid="upup-dropzone"]')).toBeTruthy()
    expect(host.querySelector('[data-upup-slot="adapter-selector"]')).toBeTruthy()
    expect(host.querySelector('[data-testid="upup-browse-files"]')).toBeTruthy()
    expect(host.querySelector('[data-testid="upup-source-url"]')).toBeTruthy()
    expect(host.querySelector('[data-testid="upup-source-camera"]')).toBeTruthy()
    up.destroy()
  })
})
