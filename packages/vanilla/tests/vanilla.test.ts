import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { UploadStatus, createUpupUploader, defineUpupElement } from '../src'

describe('@upup/vanilla', () => {
  let target: HTMLElement

  beforeEach(() => {
    target = document.createElement('div')
    document.body.append(target)
  })

  afterEach(() => {
    target.remove()
    vi.restoreAllMocks()
  })

  it('renders a local uploader and queues selected files', async () => {
    const uploader = createUpupUploader({ target })
    const input = target.querySelector<HTMLInputElement>('[data-testid="upup-file-input"]')
    const file = new File(['hello'], 'vanilla.txt', { type: 'text/plain' })

    expect(input).toBeTruthy()
    await uploader.addFiles([file])

    expect(target.textContent).toContain('vanilla.txt')
    expect(target.querySelectorAll('[data-testid="upup-file-item"]')).toHaveLength(1)

    uploader.destroy()
    expect(target.children).toHaveLength(0)
  })

  it('defines a custom element that reflects attributes into the DOM', () => {
    defineUpupElement('upup-uploader-test')
    const element = document.createElement('upup-uploader-test')
    element.setAttribute('upload-endpoint', '/upload')
    element.setAttribute('sources', 'local,url')
    element.setAttribute('enable-paste', '')
    element.setAttribute('theme', 'dark')
    document.body.append(element)

    expect(element.querySelector('[data-testid="upup-root"]')).toBeTruthy()
    expect(element.querySelector('[data-testid="upup-root"]')?.getAttribute('data-theme')).toBe('dark')
    expect(element.querySelector('input[type="url"]')).toBeTruthy()

    element.remove()
  })

  it('uploads through the core when an endpoint is configured', async () => {
    vi.stubGlobal('fetch', vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = input instanceof Request ? input.url : String(input)
      const method = input instanceof Request ? input.method : init?.method
      if (url.includes('/presign')) {
        return new Response(JSON.stringify({ uploadUrl: '/put', key: 'demo/file.txt' }), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        })
      }
      if (url.includes('/put')) {
        expect(method).toBe('PUT')
        return new Response(null, { status: 200 })
      }
      return new Response(null, { status: 404 })
    }))
    vi.stubGlobal('XMLHttpRequest', class MockXMLHttpRequest extends EventTarget {
      upload = new EventTarget()
      status = 200
      statusText = 'OK'

      open(method: string) {
        expect(method).toBe('PUT')
      }

      setRequestHeader() {}

      send(file: File) {
        this.upload.dispatchEvent(new ProgressEvent('progress', {
          lengthComputable: true,
          loaded: file.size,
          total: file.size,
        }))
        this.dispatchEvent(new Event('load'))
      }

      abort() {
        this.dispatchEvent(new Event('abort'))
      }
    })

    const uploader = createUpupUploader({ target, uploadEndpoint: '/presign' })
    await uploader.addFiles([new File(['hello'], 'upload.txt', { type: 'text/plain' })])
    const files = await uploader.upload()

    expect(files[0]?.status).toBe(UploadStatus.SUCCESSFUL)
  })
})
