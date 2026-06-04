import { describe, expect, it } from 'vitest'
import { render } from 'preact'
import { UpupUploader } from '../src'

describe('@upup/preact', () => {
  it('renders the Upup custom element with mapped attributes', () => {
    const root = document.createElement('div')
    render(
      <UpupUploader
        uploadEndpoint="/upload"
        sources="local,url"
        maxFiles={2}
        enablePaste
        theme="dark"
      />,
      root,
    )

    const element = root.querySelector('upup-uploader')
    expect(element?.getAttribute('upload-endpoint')).toBe('/upload')
    expect(element?.getAttribute('sources')).toBe('local,url')
    expect(element?.getAttribute('max-files')).toBe('2')
    expect(element?.hasAttribute('enable-paste')).toBe(true)
    expect(element?.getAttribute('theme')).toBe('dark')
  })
})
