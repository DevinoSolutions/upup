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

const makeFile = (name: string, bytes: number, type: string) =>
    new File(['x'.repeat(bytes)], name, { type })

async function pick(container: HTMLElement, files: File[]) {
    const input = container.querySelector(
        '[data-testid="upup-file-input"]',
    ) as HTMLInputElement
    await fireEvent.change(input, { target: { files } })
}

describe('the Svelte uploader passes the refusal reason through', () => {
    it('reports a too-large file named Unlimited_CV.pdf as FILE_TOO_LARGE', async () => {
        const onRestrictionFailed = vi.fn()
        const { container } = render(UpupUploader, {
            props: {
                maxFileSize: { size: 1, unit: 'KB' },
                onRestrictionFailed,
            },
        })
        const cv = makeFile('Unlimited_CV.pdf', 2048, 'application/pdf')

        await pick(container, [cv])

        await waitFor(() => {
            expect(onRestrictionFailed).toHaveBeenCalledTimes(1)
        })
        expect(onRestrictionFailed).toHaveBeenCalledWith(cv, 'FILE_TOO_LARGE')
    })

    it('reports an over-total batch as TOTAL_SIZE_EXCEEDED', async () => {
        const onRestrictionFailed = vi.fn()
        const { container } = render(UpupUploader, {
            props: {
                maxTotalFileSize: { size: 3, unit: 'KB' },
                onRestrictionFailed,
            },
        })
        const first = makeFile('a.pdf', 2048, 'application/pdf')

        await pick(container, [
            first,
            makeFile('b.pdf', 2048, 'application/pdf'),
        ])

        await waitFor(() => {
            expect(onRestrictionFailed).toHaveBeenCalledTimes(1)
        })
        expect(onRestrictionFailed).toHaveBeenCalledWith(
            first,
            'TOTAL_SIZE_EXCEEDED',
        )
    })
})

describe('a mixed drop in the Svelte uploader', () => {
    it('reports the zip and the exe one message each, leaving the png to be queued', async () => {
        const onError = vi.fn()
        const onRestrictionFailed = vi.fn()
        const { container, queryByText } = render(UpupUploader, {
            props: {
                allowedFileTypes: 'image/*',
                onError,
                onRestrictionFailed,
            },
        })
        const zip = makeFile('bundle.zip', 4, 'application/zip')
        const exe = makeFile('setup.exe', 4, 'application/x-msdownload')
        const png = makeFile('photo.png', 4, 'image/png')

        await pick(container, [zip, exe, png])

        await waitFor(() => {
            expect(onRestrictionFailed).toHaveBeenCalledTimes(2)
        })
        expect(onError.mock.calls).toEqual([
            ['File type "application/zip" is not accepted'],
            ['File type "application/x-msdownload" is not accepted'],
        ])
        expect(onRestrictionFailed.mock.calls).toEqual([
            [zip, 'TYPE_MISMATCH'],
            [exe, 'TYPE_MISMATCH'],
        ])
        await waitFor(() => {
            expect(queryByText('photo.png')).not.toBeNull()
        })
    })
})
