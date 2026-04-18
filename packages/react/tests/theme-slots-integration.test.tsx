import { describe, it, expect } from 'vitest'
import { render } from '@testing-library/react'
import { UpupUploader } from '../src'

// Verifies the v2 theme.slots API is actually wired through the runtime:
// passing a className via theme.slots should reach the real DOM.
// Tier B removed the public `classNames` prop in favour of this path.

describe('theme.slots DOM integration', () => {
  it('applies an sourceSelector.adapterButton slot override to rendered markup', () => {
    const { container } = render(
      <UpupUploader
        provider="s3"
        serverUrl="https://example.com"
        theme={{
          slots: {
            sourceSelector: { adapterButton: 'probe-adapter-btn' },
          },
        }}
      />,
    )
    expect(container.innerHTML).toContain('probe-adapter-btn')
  })

  it('applies an uploader.container slot override', () => {
    const { container } = render(
      <UpupUploader
        provider="s3"
        serverUrl="https://example.com"
        theme={{
          slots: {
            uploader: { container: 'probe-uploader-container' },
          },
        }}
      />,
    )
    expect(container.innerHTML).toContain('probe-uploader-container')
  })

  it('omitting theme.slots renders without the probe class', () => {
    const { container } = render(
      <UpupUploader provider="s3" serverUrl="https://example.com" />,
    )
    expect(container.innerHTML).not.toContain('probe-adapter-btn')
    expect(container.innerHTML).not.toContain('probe-uploader-container')
  })
})
