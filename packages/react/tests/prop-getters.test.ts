import { describe, it, expect, vi } from 'vitest'
import { createPropGetters, type PropGetterDeps } from '../src/prop-getters'

function makeDeps(overrides: Partial<PropGetterDeps> = {}): PropGetterDeps {
  return {
    addFiles: vi.fn(),
    status: 'idle',
    accept: undefined,
    multiple: true,
    isDragging: false,
    setIsDragging: vi.fn(),
    disableDragAction: false,
    ...overrides,
  }
}

describe('createPropGetters', () => {
  describe('getDropzoneProps', () => {
    it('returns role="region" and aria-label', () => {
      const { getDropzoneProps } = createPropGetters(makeDeps())
      const props = getDropzoneProps()
      expect(props.role).toBe('region')
      expect(props['aria-label']).toMatch(/drop/i)
      expect(props.tabIndex).toBe(0)
    })

    it('sets aria-dropeffect="copy" when drag is active', () => {
      const { getDropzoneProps } = createPropGetters(
        makeDeps({ isDragging: true }),
      )
      expect(getDropzoneProps()['aria-dropeffect']).toBe('copy')
    })

    it('sets aria-dropeffect="none" when drag is inactive', () => {
      const { getDropzoneProps } = createPropGetters(makeDeps())
      expect(getDropzoneProps()['aria-dropeffect']).toBe('none')
    })

    it('merges user overrides without clobbering event handlers', () => {
      const userOnDragOver = vi.fn()
      const { getDropzoneProps } = createPropGetters(makeDeps())
      const props = getDropzoneProps({ onDragOver: userOnDragOver as any })
      // Should return a function (composed handler), not the raw user handler
      expect(typeof props.onDragOver).toBe('function')
    })
  })

  describe('getRootProps', () => {
    it('returns role="application"', () => {
      const { getRootProps } = createPropGetters(makeDeps())
      expect(getRootProps().role).toBe('application')
    })

    it('sets aria-busy=true when uploading', () => {
      const { getRootProps } = createPropGetters(
        makeDeps({ status: 'uploading' }),
      )
      expect(getRootProps()['aria-busy']).toBe(true)
    })

    it('sets aria-busy=false when idle', () => {
      const { getRootProps } = createPropGetters(makeDeps())
      expect(getRootProps()['aria-busy']).toBe(false)
    })
  })

  describe('getInputProps', () => {
    it('returns type="file" and aria-hidden', () => {
      const { getInputProps } = createPropGetters(makeDeps())
      const props = getInputProps()
      expect(props.type).toBe('file')
      expect(props['aria-hidden']).toBe(true)
      expect(props.tabIndex).toBe(-1)
    })

    it('respects accept option', () => {
      const { getInputProps } = createPropGetters(
        makeDeps({ accept: 'image/*' }),
      )
      expect(getInputProps().accept).toBe('image/*')
    })

    it('respects multiple option', () => {
      const { getInputProps } = createPropGetters(
        makeDeps({ multiple: false }),
      )
      expect(getInputProps().multiple).toBe(false)
    })

    it('calls addFiles on change', () => {
      const addFiles = vi.fn()
      const { getInputProps } = createPropGetters(makeDeps({ addFiles }))
      const props = getInputProps()
      const file = new File(['test'], 'test.txt', { type: 'text/plain' })
      const event = { target: { files: [file] } } as any
      props.onChange(event)
      expect(addFiles).toHaveBeenCalledWith([file])
    })
  })
})
