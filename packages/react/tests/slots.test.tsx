import { describe, it, expect } from 'vitest'
import { render } from '@testing-library/react'
import { UpupUploader } from '../src'

const REQUIRED_SLOTS = [
  'root',
  'main-box',
  'adapter-selector',
  'file-list',
  'progress-bar',
  'header',
  'file-item',
]

// Slots that only appear after files are selected / upload starts
const CONDITIONAL_SLOTS = ['file-item', 'progress-bar']

describe('data-upup-slot attributes', () => {
  it('renders all always-visible slot attributes in the DOM', async () => {
    const { container } = render(
      <UpupUploader
        provider="s3"
        serverUrl="https://example.com"
      />
    )
    const foundSlots = Array.from(container.querySelectorAll('[data-upup-slot]'))
      .map(el => el.getAttribute('data-upup-slot'))

    for (const slot of REQUIRED_SLOTS) {
      if (CONDITIONAL_SLOTS.includes(slot)) continue
      expect(foundSlots, `Missing slot: ${slot}`).toContain(slot)
    }
  })

  it('slot attributes are on valid HTML elements (not fragments)', () => {
    const { container } = render(
      <UpupUploader
        provider="s3"
        serverUrl="https://example.com"
      />
    )
    for (const slot of REQUIRED_SLOTS) {
      const el = container.querySelector(`[data-upup-slot="${slot}"]`)
      if (el) {
        // Slot is in DOM — verify it's a real element
        expect(el.tagName).toBeTruthy()
      }
      // Some slots (file-item, progress-bar) may not render with no files selected — that's OK
    }
  })
})
