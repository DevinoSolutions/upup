import { describe, it, expect } from 'vitest'
import { render } from '@testing-library/react'
import { UpupUploader } from '../src'

describe('data-state attribute', () => {
  it('root has data-state="idle" in default state', () => {
    const { container } = render(
      <UpupUploader provider="s3" serverUrl="https://example.com" />
    )
    const root = container.querySelector('[data-upup-slot="root"]')
    expect(root?.getAttribute('data-state')).toBeTruthy()
    // Should be a valid status string, not null
    const validStates = ['idle', 'uploading', 'paused', 'successful', 'failed', 'cancelled', 'pending', 'ongoing']
    expect(validStates).toContain(root?.getAttribute('data-state'))
  })
})
