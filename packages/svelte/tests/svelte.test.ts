import { describe, expect, it } from 'vitest'
import { get } from 'svelte/store'
import { createUpupUploadStore, upupUploader } from '../src'

describe('@upup/svelte', () => {
  it('renders the Upup custom element through the Svelte action', () => {
    const host = document.createElement('div')
    const action = upupUploader(host, {
      uploadEndpoint: '/upload',
      sources: 'local,url',
      maxFiles: 2,
      enablePaste: true,
      theme: 'dark',
    })

    const element = host.querySelector('upup-uploader')
    expect(element?.getAttribute('upload-endpoint')).toBe('/upload')
    expect(element?.getAttribute('sources')).toBe('local,url')
    expect(element?.getAttribute('max-files')).toBe('2')
    expect(element?.hasAttribute('enable-paste')).toBe(true)
    expect(element?.getAttribute('theme')).toBe('dark')

    action.destroy()
    expect(host.children).toHaveLength(0)
  })

  it('exposes a store-backed headless uploader', async () => {
    const store = createUpupUploadStore({})
    await store.addFiles([new File(['hello'], 'svelte.txt', { type: 'text/plain' })])

    expect(get(store.files)[0]?.name).toBe('svelte.txt')
    store.destroy()
  })
})

