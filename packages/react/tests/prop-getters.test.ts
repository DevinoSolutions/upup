import { describe, it, expect, vi } from 'vitest'
import { createPropGetters } from '../src/prop-getters'

function makeDeps(overrides: Partial<Parameters<typeof createPropGetters>[0]> = {}) {
  return {
    addFiles: vi.fn(),
    status: 'idle',
    accept: undefined as string | undefined,
    multiple: true,
    isDragging: false,
    setIsDragging: vi.fn(),
    disableDragAction: false,
    ...overrides,
  }
}

describe('getDropzoneProps', () => {
  it('returns required dropzone attributes', () => {
    const { getDropzoneProps } = createPropGetters(makeDeps())
    const props = getDropzoneProps()
    expect(props.role).toBe('region')
    expect(props['aria-label']).toBe('Drop files here or click to browse')
    expect(props['aria-dropeffect']).toBe('none')
    expect(props.tabIndex).toBe(0)
    expect(typeof props.onDragOver).toBe('function')
    expect(typeof props.onDragLeave).toBe('function')
    expect(typeof props.onDrop).toBe('function')
    expect(typeof props.onPaste).toBe('function')
  })

  it('sets aria-dropeffect to copy when dragging', () => {
    const { getDropzoneProps } = createPropGetters(makeDeps({ isDragging: true }))
    const props = getDropzoneProps()
    expect(props['aria-dropeffect']).toBe('copy')
  })

  it('composes override event handlers', () => {
    const customDragOver = vi.fn()
    const { getDropzoneProps } = createPropGetters(makeDeps())
    const props = getDropzoneProps({ onDragOver: customDragOver } as any)

    // Call the composed handler
    const mockEvent = { preventDefault: vi.fn(), dataTransfer: { dropEffect: '' } } as any
    props.onDragOver(mockEvent)

    expect(customDragOver).toHaveBeenCalled()
  })

  it('does not process drag when disabled', () => {
    const deps = makeDeps({ disableDragAction: true })
    const { getDropzoneProps } = createPropGetters(deps)
    const props = getDropzoneProps()

    const mockEvent = { preventDefault: vi.fn(), dataTransfer: { dropEffect: '' } } as any
    props.onDragOver(mockEvent)

    // preventDefault should NOT be called because action is disabled
    expect(mockEvent.preventDefault).not.toHaveBeenCalled()
    expect(deps.setIsDragging).not.toHaveBeenCalled()
  })
})

describe('getRootProps', () => {
  it('returns required root attributes', () => {
    const { getRootProps } = createPropGetters(makeDeps())
    const props = getRootProps()
    expect(props.role).toBe('application')
    expect(props['aria-label']).toBe('File uploader')
    expect(props['aria-busy']).toBe(false)
  })

  it('sets aria-busy when uploading', () => {
    const { getRootProps } = createPropGetters(makeDeps({ status: 'uploading' }))
    const props = getRootProps()
    expect(props['aria-busy']).toBe(true)
  })

  it('merges override props', () => {
    const { getRootProps } = createPropGetters(makeDeps())
    const props = getRootProps({ id: 'my-uploader' } as any)
    expect(props.id).toBe('my-uploader')
    expect(props.role).toBe('application')
  })
})

describe('getInputProps', () => {
  it('returns required input attributes', () => {
    const { getInputProps } = createPropGetters(makeDeps())
    const props = getInputProps()
    expect(props.type).toBe('file')
    expect(props.multiple).toBe(true)
    expect(props.accept).toBeUndefined()
    expect(props.style).toEqual({ display: 'none' })
    expect(props.tabIndex).toBe(-1)
    expect(props['aria-hidden']).toBe(true)
    expect(typeof props.onChange).toBe('function')
  })

  it('sets multiple=false when limit is 1', () => {
    const { getInputProps } = createPropGetters(makeDeps({ multiple: false }))
    const props = getInputProps()
    expect(props.multiple).toBe(false)
  })

  it('passes accept filter', () => {
    const { getInputProps } = createPropGetters(makeDeps({ accept: 'image/*,.pdf' }))
    const props = getInputProps()
    expect(props.accept).toBe('image/*,.pdf')
  })

  it('calls addFiles on change', () => {
    const deps = makeDeps()
    const { getInputProps } = createPropGetters(deps)
    const props = getInputProps()

    const file = new File(['test'], 'test.txt', { type: 'text/plain' })
    const mockEvent = { target: { files: [file] } } as any
    props.onChange(mockEvent)

    expect(deps.addFiles).toHaveBeenCalledWith([file])
  })

  it('merges override props', () => {
    const { getInputProps } = createPropGetters(makeDeps())
    const props = getInputProps({ name: 'upload' } as any)
    expect(props.name).toBe('upload')
    expect(props.type).toBe('file')
  })
})
