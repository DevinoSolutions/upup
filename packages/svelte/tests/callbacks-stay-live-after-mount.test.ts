import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, waitFor } from '@testing-library/svelte'
import UpupUploader from '../src/UpupUploader.svelte'

beforeAll(() => {
    vi.stubGlobal('matchMedia', (query: string) => ({
        matches: false,
        media: query,
        onchange: null,
        addEventListener: () => {},
        removeEventListener: () => {},
        addListener: () => {},
        removeListener: () => {},
        dispatchEvent: () => false,
    }))
    vi.stubGlobal(
        'ResizeObserver',
        class {
            observe() {}
            unobserve() {}
            disconnect() {}
        },
    )
})

afterEach(() => cleanup())

const makeFile = (name: string, type: string) => new File(['x'], name, { type })

async function pick(container: HTMLElement, files: File[]) {
    const input = container.querySelector(
        '[data-testid="upup-file-input"]',
    ) as HTMLInputElement
    await fireEvent.change(input, { target: { files } })
}

describe('a callback swapped after the Svelte uploader mounted', () => {
    it('reaches the new handler and never the old one for a refused file', async () => {
        const firstOnError = vi.fn()
        const firstOnRestrictionFailed = vi.fn()
        const firstOnFileTypeMismatch = vi.fn()
        const { container, rerender } = render(UpupUploader, {
            props: {
                allowedFileTypes: 'image/*',
                onError: firstOnError,
                onRestrictionFailed: firstOnRestrictionFailed,
                onFileTypeMismatch: firstOnFileTypeMismatch,
            },
        })
        const nextOnError = vi.fn()
        const nextOnRestrictionFailed = vi.fn()
        const nextOnFileTypeMismatch = vi.fn()
        await rerender({
            onError: nextOnError,
            onRestrictionFailed: nextOnRestrictionFailed,
            onFileTypeMismatch: nextOnFileTypeMismatch,
        })
        const zip = makeFile('bundle.zip', 'application/zip')

        await pick(container, [zip])

        await waitFor(() => {
            expect(nextOnRestrictionFailed).toHaveBeenCalledTimes(1)
        })
        expect(nextOnRestrictionFailed).toHaveBeenCalledWith(
            zip,
            'TYPE_MISMATCH',
        )
        expect(nextOnError).toHaveBeenCalledTimes(1)
        expect(nextOnFileTypeMismatch).toHaveBeenCalledTimes(1)
        expect(firstOnError).not.toHaveBeenCalled()
        expect(firstOnRestrictionFailed).not.toHaveBeenCalled()
        expect(firstOnFileTypeMismatch).not.toHaveBeenCalled()
    })

    it('fires a handler that was absent at mount and added later, once', async () => {
        const { container, rerender } = render(UpupUploader, {
            props: { allowedFileTypes: 'image/*' },
        })
        const lateOnError = vi.fn()
        const lateOnRestrictionFailed = vi.fn()
        await rerender({
            onError: lateOnError,
            onRestrictionFailed: lateOnRestrictionFailed,
        })
        const zip = makeFile('bundle.zip', 'application/zip')

        await pick(container, [zip])

        await waitFor(() => {
            expect(lateOnRestrictionFailed).toHaveBeenCalledTimes(1)
        })
        expect(lateOnRestrictionFailed).toHaveBeenCalledWith(
            zip,
            'TYPE_MISMATCH',
        )
        expect(lateOnError).toHaveBeenCalledTimes(1)
    })
})
