import { describe, it, expect, vi } from 'vitest'
import type React from 'react'
import type { DragDropController } from '@upup/core/internal'
import { createPropGetters } from '../src/prop-getters'

// F-606: getDropzoneProps' onDragOver/onDragLeave/onDrop/onPaste now delegate to a
// DragDropController (the same gate every visual panel's useUploaderPanel routes
// through), rather than a second, drifted inline implementation. A fake exposing
// just the four handle* methods is enough to unit-test the DELEGATION + composition
// (ARIA/overrides) at this layer; drag-drop-controller.test.ts pins the gating rules
// themselves, and prop-getters-gating.test.ts pins them through the real hook.
function makeFakeDragDrop(overrides: Partial<Record<'handleDragOver' | 'handleDragLeave' | 'handleDrop' | 'handlePaste', ReturnType<typeof vi.fn>>> = {}) {
  return {
    handleDragOver: vi.fn(),
    handleDragLeave: vi.fn(),
    handleDrop: vi.fn(),
    handlePaste: vi.fn(),
    ...overrides,
  } as unknown as DragDropController
}

function makeDeps(overrides: Partial<Parameters<typeof createPropGetters>[0]> = {}) {
  return {
    addFiles: vi.fn(),
    status: 'idle',
    allowedFileTypes: undefined as string | undefined,
    multiple: true,
    isDragging: false,
    dragDrop: makeFakeDragDrop(),
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
    const props = getDropzoneProps({
      onDragOver: customDragOver,
    } as React.HTMLAttributes<HTMLElement>)

    // Call the composed handler
    const mockEvent = {
      preventDefault: vi.fn(),
      dataTransfer: { dropEffect: '' },
    } as unknown as React.DragEvent<HTMLElement>
    props.onDragOver(mockEvent)

    expect(customDragOver).toHaveBeenCalled()
  })

  it('delegates onDragOver to the DragDropController (gating lives there — F-606)', () => {
    const dragDrop = makeFakeDragDrop()
    const { getDropzoneProps } = createPropGetters(makeDeps({ dragDrop }))
    const mockEvent = {
      preventDefault: vi.fn(),
      dataTransfer: { dropEffect: '' },
    } as unknown as React.DragEvent<HTMLElement>

    getDropzoneProps().onDragOver(mockEvent)

    expect(dragDrop.handleDragOver).toHaveBeenCalledWith(mockEvent)
  })

  it('is a no-op when no dragDrop controller is supplied (back-compat)', () => {
    const { getDropzoneProps } = createPropGetters(makeDeps({ dragDrop: undefined }))
    const mockEvent = {
      preventDefault: vi.fn(),
      dataTransfer: { dropEffect: '' },
    } as unknown as React.DragEvent<HTMLElement>

    expect(() => getDropzoneProps().onDragOver(mockEvent)).not.toThrow()
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
    const props = getRootProps({
      id: 'my-uploader',
    } as React.HTMLAttributes<HTMLElement>)
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
    const { getInputProps } = createPropGetters(makeDeps({ allowedFileTypes: 'image/*,.pdf' }))
    const props = getInputProps()
    expect(props.accept).toBe('image/*,.pdf')
  })

  it('calls addFiles on change', () => {
    const deps = makeDeps()
    const { getInputProps } = createPropGetters(deps)
    const props = getInputProps()

    const file = new File(['test'], 'test.txt', { type: 'text/plain' })
    const mockEvent = {
      target: { files: [file] },
    } as unknown as React.ChangeEvent<HTMLInputElement>
    props.onChange(mockEvent)

    expect(deps.addFiles).toHaveBeenCalledWith([file])
  })

  it('merges override props', () => {
    const { getInputProps } = createPropGetters(makeDeps())
    const props = getInputProps({
      name: 'upload',
    } as React.InputHTMLAttributes<HTMLInputElement>)
    expect(props.name).toBe('upload')
    expect(props.type).toBe('file')
  })
})
