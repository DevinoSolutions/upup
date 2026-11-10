import { describe, it, expect, vi } from 'vitest'
import {
    UpupErrorCode,
    UpupValidationError,
    type UpupCore,
} from '@useupup/core'
import { buildUploaderContext } from '../src/context'

const makeFile = (name: string, bytes: number, type: string) =>
    new File(['x'.repeat(bytes)], name, { type })

// The vanilla options carry no `onRestrictionFailed` callback (documented), so
// the structured reason is observed where vanilla consumers get it: the core
// `restriction-failed` event the shared controller leaves intact.
function observeRefusals(core: UpupCore) {
    const seen: UpupValidationError[] = []
    core.on('restriction-failed', ({ error }) => {
        seen.push(error as UpupValidationError)
    })
    return seen
}

describe('the vanilla uploader reports each refusal with its real reason', () => {
    it('carries FILE_TOO_LARGE for a too-large file named Unlimited_CV.pdf', async () => {
        const onError = vi.fn()
        const { ctx, destroy } = buildUploaderContext(
            { maxFileSize: { size: 1, unit: 'KB' }, onError },
            () => {},
        )
        const seen = observeRefusals(ctx.core)
        const cv = makeFile('Unlimited_CV.pdf', 2048, 'application/pdf')

        await ctx.setFiles([cv])

        expect(seen.map(e => e.reason)).toEqual([UpupErrorCode.FILE_TOO_LARGE])
        expect(seen[0]?.file).toBe(cv)
        expect(onError).toHaveBeenCalledTimes(1)
        destroy()
    })

    it('carries TOTAL_SIZE_EXCEEDED for an over-total batch', async () => {
        const { ctx, destroy } = buildUploaderContext(
            { maxTotalFileSize: { size: 3, unit: 'KB' } },
            () => {},
        )
        const seen = observeRefusals(ctx.core)

        await ctx.setFiles([
            makeFile('a.pdf', 2048, 'application/pdf'),
            makeFile('b.pdf', 2048, 'application/pdf'),
        ])

        expect(seen.map(e => e.reason)).toEqual([
            UpupErrorCode.TOTAL_SIZE_EXCEEDED,
        ])
        expect(ctx.core.files.size).toBe(0)
        destroy()
    })
})

describe('a mixed drop in the vanilla uploader', () => {
    it('queues the png and reports the zip and the exe one message each', async () => {
        const onError = vi.fn()
        const { ctx, destroy } = buildUploaderContext(
            { allowedFileTypes: 'image/*', onError },
            () => {},
        )
        const png = makeFile('photo.png', 4, 'image/png')

        await ctx.setFiles([
            makeFile('bundle.zip', 4, 'application/zip'),
            makeFile('setup.exe', 4, 'application/x-msdownload'),
            png,
        ])

        expect([...ctx.core.files.values()].map(f => f.name)).toEqual([
            'photo.png',
        ])
        expect(onError.mock.calls).toEqual([
            ['File type "application/zip" is not accepted'],
            ['File type "application/x-msdownload" is not accepted'],
        ])
        destroy()
    })
})
