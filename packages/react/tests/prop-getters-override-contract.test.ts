import { describe, it, expect, vi } from 'vitest'
import type React from 'react'
import type { DragDropController } from '@upupjs/core/internal'
import { createPropGetters } from '../src/prop-getters'

// Issue #341 — the three prop getters each handled `overrides` differently:
// getRootProps spread them but then wrote getter keys (including a literal
// `aria-describedby: undefined`) over the top; getDropzoneProps composed the four
// drag handlers and DROPPED every other override key, so className/style/id
// silently vanished; getInputProps spread them but replaced `style` wholesale
// with `{ display: 'none' }`.
//
// This file pins the ONE contract all three now share:
//
//   1. `...overrides` is spread FIRST — anything passed survives by default.
//   2. Getter-OWNED keys are re-applied after the spread and win, but only the
//      ones derived from core state or required for the element to function:
//        root     -> aria-busy
//        dropzone -> aria-dropeffect
//        input    -> type, multiple, accept (when core has a filter),
//                    style.display
//   3. Event handlers are COMPOSED, never replaced: the getter's own handler
//      runs first, then the caller's.
//   4. `style` is MERGED, not replaced.
//   5. Everything else the getter sets (role, aria-label, tabIndex,
//      aria-hidden) is a DEFAULT the caller may override.

function makeFakeDragDrop() {
    return {
        handleDragOver: vi.fn(),
        handleDragLeave: vi.fn(),
        handleDrop: vi.fn(),
        handlePaste: vi.fn(),
    } as unknown as DragDropController
}

function makeDeps(
    overrides: Partial<Parameters<typeof createPropGetters>[0]> = {},
) {
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

const anyEvent = () =>
    ({ preventDefault: vi.fn() }) as unknown as React.DragEvent<HTMLElement>

describe('prop-getter override contract (#341) — rule 1: overrides survive', () => {
    it('getDropzoneProps keeps non-handler override keys', () => {
        const { getDropzoneProps } = createPropGetters(makeDeps())
        const props = getDropzoneProps({
            className: 'my-zone',
            id: 'zone',
            style: { padding: 8 },
            'data-testid': 'custom',
        } as React.HTMLAttributes<HTMLElement>)

        expect(props.className).toBe('my-zone')
        expect(props.id).toBe('zone')
        expect(props.style).toEqual({ padding: 8 })
        expect((props as Record<string, unknown>)['data-testid']).toBe('custom')
    })

    it('getRootProps keeps non-handler override keys', () => {
        const { getRootProps } = createPropGetters(makeDeps())
        const props = getRootProps({
            className: 'my-root',
            style: { display: 'grid' },
        } as React.HTMLAttributes<HTMLElement>)

        expect(props.className).toBe('my-root')
        expect(props.style).toEqual({ display: 'grid' })
    })

    it('getRootProps does not clobber an aria-describedby override with undefined', () => {
        const { getRootProps } = createPropGetters(makeDeps())
        const props = getRootProps({
            'aria-describedby': 'help-text',
        } as React.HTMLAttributes<HTMLElement>)

        expect(props['aria-describedby']).toBe('help-text')
    })

    it('getInputProps keeps non-handler override keys', () => {
        const { getInputProps } = createPropGetters(makeDeps())
        const props = getInputProps({
            name: 'upload',
            className: 'sr-only',
        } as React.InputHTMLAttributes<HTMLInputElement>)

        expect(props.name).toBe('upload')
        expect(props.className).toBe('sr-only')
    })
})

describe('prop-getter override contract (#341) — rule 2: getter-owned keys win', () => {
    it('root aria-busy is derived from status, not overridable', () => {
        const { getRootProps } = createPropGetters(
            makeDeps({ status: 'uploading' }),
        )
        const props = getRootProps({
            'aria-busy': false,
        } as React.HTMLAttributes<HTMLElement>)

        expect(props['aria-busy']).toBe(true)
    })

    it('dropzone aria-dropeffect is derived from drag state, not overridable', () => {
        const { getDropzoneProps } = createPropGetters(
            makeDeps({ isDragging: true }),
        )
        const props = getDropzoneProps({
            'aria-dropeffect': 'none',
        } as React.HTMLAttributes<HTMLElement>)

        expect(props['aria-dropeffect']).toBe('copy')
    })

    it('input type stays "file"', () => {
        const { getInputProps } = createPropGetters(makeDeps())
        const props = getInputProps({
            type: 'text',
        } as React.InputHTMLAttributes<HTMLInputElement>)

        expect(props.type).toBe('file')
    })

    it('input multiple/accept follow core options when core has a filter', () => {
        const { getInputProps } = createPropGetters(
            makeDeps({ allowedFileTypes: 'image/*', multiple: false }),
        )
        const props = getInputProps({
            accept: '*/*',
            multiple: true,
        } as React.InputHTMLAttributes<HTMLInputElement>)

        expect(props.accept).toBe('image/*')
        expect(props.multiple).toBe(false)
    })

    it('an accept override survives when core declares no file-type filter', () => {
        const { getInputProps } = createPropGetters(
            makeDeps({ allowedFileTypes: undefined }),
        )
        const props = getInputProps({
            accept: '.csv',
        } as React.InputHTMLAttributes<HTMLInputElement>)

        expect(props.accept).toBe('.csv')
    })
})

describe('prop-getter override contract (#341) — rule 3: handlers compose', () => {
    it.each([
        ['onDragOver', 'handleDragOver'],
        ['onDragLeave', 'handleDragLeave'],
        ['onDrop', 'handleDrop'],
        ['onPaste', 'handlePaste'],
    ] as const)(
        'dropzone %s runs the getter delegation AND the override',
        (propName, method) => {
            const dragDrop = makeFakeDragDrop()
            const override = vi.fn()
            const { getDropzoneProps } = createPropGetters(
                makeDeps({ dragDrop }),
            )
            const e = anyEvent()

            const handler = getDropzoneProps({
                [propName]: override,
            } as unknown as React.HTMLAttributes<HTMLElement>)[propName] as (
                event: unknown,
            ) => void
            handler(e)

            expect(dragDrop[method]).toHaveBeenCalledWith(e)
            expect(override).toHaveBeenCalledWith(e)
        },
    )

    it('the getter handler runs BEFORE the override', () => {
        const order: string[] = []
        const dragDrop = {
            handleDragOver: vi.fn(() => order.push('getter')),
            handleDragLeave: vi.fn(),
            handleDrop: vi.fn(),
            handlePaste: vi.fn(),
        } as unknown as DragDropController
        const { getDropzoneProps } = createPropGetters(makeDeps({ dragDrop }))

        getDropzoneProps({
            onDragOver: () => order.push('override'),
        } as React.HTMLAttributes<HTMLElement>).onDragOver!(anyEvent())

        expect(order).toEqual(['getter', 'override'])
    })

    it('input onChange runs addFiles AND the override', () => {
        const deps = makeDeps()
        const override = vi.fn()
        const { getInputProps } = createPropGetters(deps)
        const file = new File(['x'], 'a.txt', { type: 'text/plain' })
        const e = {
            target: { files: [file] },
        } as unknown as React.ChangeEvent<HTMLInputElement>

        getInputProps({
            onChange: override,
        } as React.InputHTMLAttributes<HTMLInputElement>).onChange!(e)

        expect(deps.addFiles).toHaveBeenCalledWith([file])
        expect(override).toHaveBeenCalledWith(e)
    })
})

describe('prop-getter override contract (#341) — rule 4: style merges', () => {
    it('getInputProps keeps override style keys and still hides the input', () => {
        const { getInputProps } = createPropGetters(makeDeps())
        const props = getInputProps({
            style: { position: 'absolute', width: 1 },
        } as React.InputHTMLAttributes<HTMLInputElement>)

        expect(props.style).toEqual({
            position: 'absolute',
            width: 1,
            display: 'none',
        })
    })

    it('an override cannot un-hide the input', () => {
        const { getInputProps } = createPropGetters(makeDeps())
        const props = getInputProps({
            style: { display: 'block' },
        } as React.InputHTMLAttributes<HTMLInputElement>)

        expect(props.style?.display).toBe('none')
    })
})

describe('prop-getter override contract (#341) — rule 5: the rest are defaults', () => {
    it('root role and aria-label are overridable', () => {
        const { getRootProps } = createPropGetters(makeDeps())
        const props = getRootProps({
            role: 'group',
            'aria-label': 'Attach receipts',
        } as React.HTMLAttributes<HTMLElement>)

        expect(props.role).toBe('group')
        expect(props['aria-label']).toBe('Attach receipts')
    })

    it('dropzone role, aria-label and tabIndex are overridable', () => {
        const { getDropzoneProps } = createPropGetters(makeDeps())
        const props = getDropzoneProps({
            role: 'button',
            'aria-label': 'Drop receipts',
            tabIndex: -1,
        } as React.HTMLAttributes<HTMLElement>)

        expect(props.role).toBe('button')
        expect(props['aria-label']).toBe('Drop receipts')
        expect(props.tabIndex).toBe(-1)
    })

    it('input tabIndex and aria-hidden are overridable', () => {
        const { getInputProps } = createPropGetters(makeDeps())
        const props = getInputProps({
            tabIndex: 0,
            'aria-hidden': false,
        } as React.InputHTMLAttributes<HTMLInputElement>)

        expect(props.tabIndex).toBe(0)
        expect(props['aria-hidden']).toBe(false)
    })

    it('defaults still apply when no override is passed', () => {
        const { getRootProps, getDropzoneProps, getInputProps } =
            createPropGetters(makeDeps())

        expect(getRootProps().role).toBe('application')
        expect(getRootProps()['aria-label']).toBe('File uploader')
        expect(getDropzoneProps().role).toBe('region')
        expect(getDropzoneProps().tabIndex).toBe(0)
        expect(getInputProps().tabIndex).toBe(-1)
        expect(getInputProps()['aria-hidden']).toBe(true)
        expect(getInputProps().style).toEqual({ display: 'none' })
    })
})
