import { describe, it, expect, vi } from 'vitest'
import { createUploaderController } from '../../uploader/create-uploader-controller'
import { normalizeUploaderOptions } from '../../uploader/normalize-options'
import { UpupCore } from '../../core'
import { UpupErrorCode, UpupValidationError } from '../../errors'
import type { UploaderControllerOptions } from '../../uploader/types'

function build(options: UploaderControllerOptions = {}) {
    const normalized = normalizeUploaderOptions(options)
    const core = new UpupCore(normalized.coreOptions)
    const controller = createUploaderController({ core, options, normalized })
    return { controller, core }
}

const makeFile = (name: string, size: number, type: string) =>
    new File(['x'.repeat(size)], name, { type })

describe('the visual uploader passes the refusal reason through', () => {
    it('reports a too-large file as FILE_TOO_LARGE even when its name contains "limit"', async () => {
        const onRestrictionFailed = vi.fn()
        const onError = vi.fn()
        const { controller, core } = build({
            maxFileSize: { size: 1, unit: 'KB' },
            onRestrictionFailed,
            onError,
        })
        const file = makeFile('Unlimited_CV.pdf', 2048, 'application/pdf')

        await controller.commands.handleSetSelectedFiles([file])

        expect(onRestrictionFailed).toHaveBeenCalledTimes(1)
        expect(onRestrictionFailed).toHaveBeenCalledWith(
            file,
            UpupErrorCode.FILE_TOO_LARGE,
        )
        expect(onError).toHaveBeenCalledTimes(1)
        controller.destroy()
        core.destroy()
    })

    it('reports an over-total batch as TOTAL_SIZE_EXCEEDED, not FILE_TOO_LARGE', async () => {
        const onRestrictionFailed = vi.fn()
        const { controller, core } = build({
            maxTotalFileSize: { size: 3, unit: 'KB' },
            onRestrictionFailed,
        })
        const first = makeFile('a.pdf', 2048, 'application/pdf')
        const second = makeFile('b.pdf', 2048, 'application/pdf')

        await controller.commands.handleSetSelectedFiles([first, second])

        expect(onRestrictionFailed).toHaveBeenCalledTimes(1)
        expect(onRestrictionFailed).toHaveBeenCalledWith(
            first,
            UpupErrorCode.TOTAL_SIZE_EXCEEDED,
        )
        expect(core.files.size).toBe(0)
        controller.destroy()
        core.destroy()
    })

    it('reports each refusal against its own file with its own reason', async () => {
        const onRestrictionFailed = vi.fn()
        const onFileTypeMismatch = vi.fn()
        const { controller, core } = build({
            allowedFileTypes: 'image/*',
            minFileSize: { size: 2, unit: 'B' },
            onRestrictionFailed,
            onFileTypeMismatch,
        })
        const zip = makeFile('bundle.zip', 8, 'application/zip')
        const tiny = makeFile('tiny.png', 1, 'image/png')

        await controller.commands.handleSetSelectedFiles([zip, tiny])

        expect(onRestrictionFailed).toHaveBeenCalledWith(
            zip,
            UpupErrorCode.TYPE_MISMATCH,
        )
        expect(onRestrictionFailed).toHaveBeenCalledWith(
            tiny,
            UpupErrorCode.FILE_TOO_SMALL,
        )
        expect(onFileTypeMismatch).toHaveBeenCalledTimes(1)
        expect(onFileTypeMismatch).toHaveBeenCalledWith(zip, 'image/*')
        controller.destroy()
        core.destroy()
    })

    it('reads the reason off a rejected UpupValidationError, never off its message text', async () => {
        const onRestrictionFailed = vi.fn()
        const onError = vi.fn()
        const { controller, core } = build({ onRestrictionFailed, onError })
        const file = makeFile('a.txt', 1, 'text/plain')
        vi.spyOn(core, 'addFiles').mockRejectedValue(
            new UpupValidationError(
                'size limit type below',
                UpupErrorCode.TOTAL_SIZE_EXCEEDED,
                file,
            ),
        )

        await controller.commands.handleSetSelectedFiles([file])

        expect(onRestrictionFailed).toHaveBeenCalledTimes(1)
        expect(onRestrictionFailed).toHaveBeenCalledWith(
            file,
            UpupErrorCode.TOTAL_SIZE_EXCEEDED,
        )
        expect(onError).toHaveBeenCalledWith('size limit type below')
        controller.destroy()
        core.destroy()
    })

    it('reports an ordinary failure to onError only, without guessing a reason', async () => {
        const onRestrictionFailed = vi.fn()
        const onError = vi.fn()
        const { controller, core } = build({ onRestrictionFailed, onError })
        vi.spyOn(core, 'addFiles').mockRejectedValue(
            new Error('type limit size below'),
        )

        await controller.commands.handleSetSelectedFiles([
            makeFile('a.txt', 1, 'text/plain'),
        ])

        expect(onError).toHaveBeenCalledWith('type limit size below')
        expect(onRestrictionFailed).not.toHaveBeenCalled()
        controller.destroy()
        core.destroy()
    })
})

describe('a mixed drop keeps the valid file and reports each refusal once', () => {
    it('queues the png and gives each of the zip and the exe its own readable message', async () => {
        const onError = vi.fn()
        const onRestrictionFailed = vi.fn()
        const { controller, core } = build({
            allowedFileTypes: 'image/*',
            onError,
            onRestrictionFailed,
        })
        const zip = makeFile('bundle.zip', 4, 'application/zip')
        const exe = makeFile('setup.exe', 4, 'application/x-msdownload')
        const png = makeFile('photo.png', 4, 'image/png')

        await expect(
            controller.commands.handleSetSelectedFiles([zip, exe, png]),
        ).resolves.toBeUndefined()

        expect([...core.files.values()].map(f => f.name)).toEqual(['photo.png'])
        expect(onError.mock.calls).toEqual([
            ['File type "application/zip" is not accepted'],
            ['File type "application/x-msdownload" is not accepted'],
        ])
        expect(onRestrictionFailed.mock.calls).toEqual([
            [zip, UpupErrorCode.TYPE_MISMATCH],
            [exe, UpupErrorCode.TYPE_MISMATCH],
        ])
        controller.destroy()
        core.destroy()
    })

    it('reports a batch where every file is refused once per file, with no second report from the rejection', async () => {
        const onError = vi.fn()
        const { controller, core } = build({
            allowedFileTypes: 'image/*',
            onError,
        })

        await expect(
            controller.commands.handleSetSelectedFiles([
                makeFile('bundle.zip', 4, 'application/zip'),
                makeFile('setup.exe', 4, 'application/x-msdownload'),
            ]),
        ).resolves.toBeUndefined()

        expect(core.files.size).toBe(0)
        expect(onError).toHaveBeenCalledTimes(2)
        controller.destroy()
        core.destroy()
    })
})
