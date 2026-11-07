import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import {
    act,
    cleanup,
    fireEvent,
    render,
    waitFor,
} from '@testing-library/react'
import React, { createRef } from 'react'
import { UpupUploader } from '../src'
import type { UploaderRef } from '../src'

/**
 * T-15015 — the real <UpupUploader> over a real core. Only the file input and
 * the presign `fetch` are scripted; picking, validation, the controller and the
 * orchestrator's onError bridge are the shipped code.
 */

const makeFile = (name: string, bytes: number, type: string) =>
    new File(['x'.repeat(bytes)], name, { type })

function pick(container: HTMLElement, files: File[]) {
    const input = container.querySelector(
        '[data-testid="upup-file-input"]',
    ) as HTMLInputElement
    fireEvent.change(input, { target: { files } })
}

afterEach(() => {
    cleanup()
    vi.unstubAllGlobals()
})

describe('the React uploader passes the refusal reason through', () => {
    it('reports a too-large file named Unlimited_CV.pdf as FILE_TOO_LARGE', async () => {
        const onRestrictionFailed = vi.fn()
        const onError = vi.fn()
        const { container } = render(
            <UpupUploader
                maxFileSize={{ size: 1, unit: 'KB' }}
                onRestrictionFailed={onRestrictionFailed}
                onError={onError}
            />,
        )
        const cv = makeFile('Unlimited_CV.pdf', 2048, 'application/pdf')

        pick(container, [cv])

        await waitFor(() => {
            expect(onRestrictionFailed).toHaveBeenCalledTimes(1)
        })
        expect(onRestrictionFailed).toHaveBeenCalledWith(cv, 'FILE_TOO_LARGE')
        expect(onError).toHaveBeenCalledTimes(1)
    })

    it('reports an over-total batch as TOTAL_SIZE_EXCEEDED', async () => {
        const onRestrictionFailed = vi.fn()
        const ref = createRef<UploaderRef>()
        const { container } = render(
            <UpupUploader
                ref={ref}
                maxTotalFileSize={{ size: 3, unit: 'KB' }}
                onRestrictionFailed={onRestrictionFailed}
            />,
        )
        const first = makeFile('a.pdf', 2048, 'application/pdf')

        pick(container, [first, makeFile('b.pdf', 2048, 'application/pdf')])

        await waitFor(() => {
            expect(onRestrictionFailed).toHaveBeenCalledTimes(1)
        })
        expect(onRestrictionFailed).toHaveBeenCalledWith(
            first,
            'TOTAL_SIZE_EXCEEDED',
        )
        expect(ref.current!.useUpload().files).toHaveLength(0)
    })
})

describe('a mixed drop in the React uploader', () => {
    it('queues the png and reports the zip and the exe one message each', async () => {
        const onError = vi.fn()
        const onRestrictionFailed = vi.fn()
        const ref = createRef<UploaderRef>()
        const { container } = render(
            <UpupUploader
                ref={ref}
                allowedFileTypes="image/*"
                onError={onError}
                onRestrictionFailed={onRestrictionFailed}
            />,
        )
        const zip = makeFile('bundle.zip', 4, 'application/zip')
        const exe = makeFile('setup.exe', 4, 'application/x-msdownload')
        const png = makeFile('photo.png', 4, 'image/png')

        pick(container, [zip, exe, png])

        await waitFor(() => {
            expect(ref.current!.useUpload().files.map(f => f.name)).toEqual([
                'photo.png',
            ])
        })
        expect(onError.mock.calls).toEqual([
            ['File type "application/zip" is not accepted'],
            ['File type "application/x-msdownload" is not accepted'],
        ])
        expect(onRestrictionFailed.mock.calls).toEqual([
            [zip, 'TYPE_MISMATCH'],
            [exe, 'TYPE_MISMATCH'],
        ])
    })
})

describe('one failed upload calls the React onError once', () => {
    beforeEach(() => {
        vi.stubGlobal(
            'fetch',
            vi.fn(async () => {
                throw new Error('presign down')
            }),
        )
    })

    it('does not follow the per-file error with the batch summary', async () => {
        const onError = vi.fn()
        const ref = createRef<UploaderRef>()
        render(
            <UpupUploader
                ref={ref}
                provider="s3"
                uploadEndpoint="/api/presign"
                maxRetries={0}
                crashRecovery={false}
                onError={onError}
            />,
        )

        await act(async () => {
            await ref
                .current!.useUpload()
                .uploadFiles([makeFile('a.txt', 4, 'text/plain')])
                .catch(() => undefined)
        })

        await waitFor(() => {
            expect(onError).toHaveBeenCalled()
        })
        expect(onError).toHaveBeenCalledTimes(1)
        expect(onError.mock.calls[0]?.[0]).not.toContain('upload(s) failed')
    })
})
