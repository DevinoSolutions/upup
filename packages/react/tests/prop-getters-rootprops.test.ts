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

// ─────────────────────────────────────────────
// getRootProps
// ─────────────────────────────────────────────
describe('getRootProps', () => {
    it('returns role="application"', () => {
        const { getRootProps } = createPropGetters(makeDeps())
        expect(getRootProps().role).toBe('application')
    })

    it('returns aria-label', () => {
        const { getRootProps } = createPropGetters(makeDeps())
        expect(getRootProps()['aria-label']).toBe('File uploader')
    })

    it('aria-busy is false when not uploading', () => {
        const { getRootProps } = createPropGetters(makeDeps({ status: 'idle' }))
        expect(getRootProps()['aria-busy']).toBe(false)
    })

    it('aria-busy is true when uploading', () => {
        const { getRootProps } = createPropGetters(makeDeps({ status: 'uploading' }))
        expect(getRootProps()['aria-busy']).toBe(true)
    })

    it('merges custom overrides', () => {
        const { getRootProps } = createPropGetters(makeDeps())
        const props = getRootProps({ className: 'my-root', 'data-testid': 'root' } as any)
        expect(props.className).toBe('my-root')
        expect(props['data-testid']).toBe('root')
        expect(props.role).toBe('application') // base preserved
    })
})

// ─────────────────────────────────────────────
// getInputProps — edge cases
// ─────────────────────────────────────────────
describe('getInputProps — edge cases', () => {
    it('sets multiple=true by default', () => {
        const { getInputProps } = createPropGetters(makeDeps())
        expect(getInputProps().multiple).toBe(true)
    })

    it('sets multiple=false when configured', () => {
        const { getInputProps } = createPropGetters(makeDeps({ multiple: false }))
        expect(getInputProps().multiple).toBe(false)
    })

    it('accept is undefined when not set', () => {
        const { getInputProps } = createPropGetters(makeDeps())
        expect(getInputProps().accept).toBeUndefined()
    })

    it('accept is passed through when set', () => {
        const { getInputProps } = createPropGetters(makeDeps({ accept: 'image/*,.pdf' }))
        expect(getInputProps().accept).toBe('image/*,.pdf')
    })

    it('has aria-hidden=true', () => {
        const { getInputProps } = createPropGetters(makeDeps())
        expect(getInputProps()['aria-hidden']).toBe(true)
    })

    it('has tabIndex=-1', () => {
        const { getInputProps } = createPropGetters(makeDeps())
        expect(getInputProps().tabIndex).toBe(-1)
    })

    it('onChange calls addFiles with selected files', () => {
        const deps = makeDeps()
        const { getInputProps } = createPropGetters(deps)
        const file = new File(['x'], 'test.txt', { type: 'text/plain' })
        const event = {
            target: { files: [file] },
        } as any
        getInputProps().onChange(event)
        expect(deps.addFiles).toHaveBeenCalledWith([file])
    })
})
