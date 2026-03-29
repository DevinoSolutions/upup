import { describe, it, expect, vi } from 'vitest'
import { render, fireEvent } from '@testing-library/react'
import { PasteZone } from '../src/components/paste-zone'

describe('PasteZone', () => {
  it('renders children', () => {
    const onPaste = vi.fn()
    const { getByText } = render(
      <PasteZone onPaste={onPaste}>
        <div>Paste here</div>
      </PasteZone>
    )
    expect(getByText('Paste here')).toBeDefined()
  })

  it('calls onPaste with files from clipboard', () => {
    const onPaste = vi.fn()
    const { container } = render(
      <PasteZone onPaste={onPaste}>
        <div>Paste here</div>
      </PasteZone>
    )

    const file = new File(['content'], 'screenshot.png', { type: 'image/png' })
    const clipboardData = {
      items: [{ kind: 'file', getAsFile: () => file }],
    }

    fireEvent.paste(container.firstChild!, { clipboardData })

    expect(onPaste).toHaveBeenCalledWith([file])
  })

  it('generates filename for pasted images without name', () => {
    const onPaste = vi.fn()
    const { container } = render(
      <PasteZone onPaste={onPaste}>
        <div>Paste here</div>
      </PasteZone>
    )

    const blob = new File([''], '', { type: 'image/png' })
    Object.defineProperty(blob, 'name', { value: '' })

    const clipboardData = {
      items: [{ kind: 'file', getAsFile: () => blob }],
    }

    fireEvent.paste(container.firstChild!, { clipboardData })

    expect(onPaste).toHaveBeenCalled()
    const pastedFiles = onPaste.mock.calls[0][0]
    expect(pastedFiles[0].name).toMatch(/^pasted-image-\d+\.png$/)
  })

  it('ignores non-file paste events', () => {
    const onPaste = vi.fn()
    const { container } = render(
      <PasteZone onPaste={onPaste}>
        <div>Paste here</div>
      </PasteZone>
    )

    const clipboardData = {
      items: [{ kind: 'string', getAsFile: () => null }],
    }

    fireEvent.paste(container.firstChild!, { clipboardData })

    expect(onPaste).not.toHaveBeenCalled()
  })
})
