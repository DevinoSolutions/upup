import { describe, it, expect } from 'vitest'
import { render } from '@testing-library/react'
import { UpupUploader } from '../src'

// Verifies the v2 theme.slots API is actually wired through the runtime:
// passing a className via theme.slots should reach the real DOM.
// Tier B removed the old flat styling prop in favour of this path.

describe('theme.slots DOM integration', () => {
  it('applies a sourceSelector.sourceButton slot override to rendered markup', () => {
    const { container } = render(
      <UpupUploader
        provider="s3"
        serverUrl="https://example.com"
        theme={{
          slots: {
            sourceSelector: { sourceButton: 'probe-adapter-btn' },
          },
        }}
      />,
    )
    expect(container.innerHTML).toContain('probe-adapter-btn')
  })

  it('applies a sourceSelector.sourceButtonIcon slot override to the source icons', () => {
    const { container } = render(
      <UpupUploader
        provider="s3"
        serverUrl="https://example.com"
        theme={{
          slots: {
            sourceSelector: { sourceButtonIcon: 'probe-source-icon' },
          },
        }}
      />,
    )
    const probed = container.querySelectorAll('svg.probe-source-icon')
    expect(probed.length).toBeGreaterThan(0)
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
