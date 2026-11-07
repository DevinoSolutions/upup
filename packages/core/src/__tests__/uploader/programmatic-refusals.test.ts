import { describe, it, expect, vi, afterEach } from 'vitest'
import { createUploaderController } from '../../uploader/create-uploader-controller'
import { normalizeUploaderOptions } from '../../uploader/normalize-options'
import { UpupCore } from '../../core'
import { UpupErrorCode } from '../../errors'
import type { UploadFile } from '../../types/upload-file'
import type { UploaderControllerOptions } from '../../uploader/types'

function build(options: UploaderControllerOptions = {}) {
    const normalized = normalizeUploaderOptions(options)
    const core = new UpupCore(normalized.coreOptions)
    // No upload target here: the commands under test are about admission, so
    // the upload they chain into is replaced rather than sent anywhere.
    const upload = vi.spyOn(core, 'upload').mockResolvedValue([])
    const controller = createUploaderController({ core, options, normalized })
    return { controller, core, upload }
}

const makeFile = (name: string, size: number, type = 'image/png') =>
    new File(['x'.repeat(size)], name, { type })

// `onPrepareFiles` is typed for `UploadFile`s, but the orchestrator re-adds
// whatever it returns through `addFiles`, plain `File`s included.
const asUploadFiles = (files: File[]) => files as unknown as UploadFile[]

const names = (core: UpupCore) => [...core.files.values()].map(f => f.name)

afterEach(() => {
    vi.restoreAllMocks()
})

describe('programmatic file commands report a refusal like a picker drop', () => {
    it('uploadFiles uploads the acceptable file and reports the refused one exactly once', async () => {
        const onError = vi.fn()
        const onRestrictionFailed = vi.fn()
        const { controller, core, upload } = build({
            maxFileSize: { size: 1, unit: 'KB' },
            onError,
            onRestrictionFailed,
        })
        const ok = makeFile('ok.png', 100)
        const tooBig = makeFile('big.png', 4096)

        await controller.commands.uploadFiles([ok, tooBig])

        expect(names(core)).toEqual(['ok.png'])
        expect(upload).toHaveBeenCalledTimes(1)
        expect(onError).toHaveBeenCalledTimes(1)
        expect(onRestrictionFailed).toHaveBeenCalledTimes(1)
        expect(onRestrictionFailed).toHaveBeenCalledWith(
            tooBig,
            UpupErrorCode.FILE_TOO_LARGE,
        )
        controller.destroy()
        core.destroy()
    })

    it('uploadFiles reports each refused file once and uploads nothing when every file is refused', async () => {
        const onError = vi.fn()
        const onRestrictionFailed = vi.fn()
        const { controller, core, upload } = build({
            allowedFileTypes: 'image/*',
            onError,
            onRestrictionFailed,
        })

        await expect(
            controller.commands.uploadFiles([
                makeFile('a.zip', 8, 'application/zip'),
                makeFile('b.exe', 8, 'application/x-msdownload'),
            ]),
        ).rejects.toMatchObject({ reason: UpupErrorCode.TYPE_MISMATCH })

        expect(upload).not.toHaveBeenCalled()
        expect(onError).toHaveBeenCalledTimes(2)
        expect(onRestrictionFailed).toHaveBeenCalledTimes(2)
        controller.destroy()
        core.destroy()
    })

    it('replaceFiles keeps the acceptable file and reports the refused one exactly once', async () => {
        const onError = vi.fn()
        const onRestrictionFailed = vi.fn()
        const { controller, core } = build({
            maxFileSize: { size: 1, unit: 'KB' },
            onError,
            onRestrictionFailed,
        })
        const ok = makeFile('ok.png', 100)
        const tooBig = makeFile('big.png', 4096)

        controller.commands.replaceFiles([ok, tooBig])
        await vi.waitFor(() => expect(names(core)).toEqual(['ok.png']))

        expect(onError).toHaveBeenCalledTimes(1)
        expect(onRestrictionFailed).toHaveBeenCalledTimes(1)
        expect(onRestrictionFailed).toHaveBeenCalledWith(
            tooBig,
            UpupErrorCode.FILE_TOO_LARGE,
        )
        controller.destroy()
        core.destroy()
    })

    it('an all-refused replaceFiles reports every file, keeps the selection and leaves its previews alive', async () => {
        const onError = vi.fn()
        const onRestrictionFailed = vi.fn()
        const { controller, core } = build({
            allowedFileTypes: 'image/*',
            onError,
            onRestrictionFailed,
        })
        await controller.commands.handleSetSelectedFiles([
            makeFile('keep.png', 10),
        ])
        const [kept] = [...core.files.values()]
        expect(kept?.url).toMatch(/^blob:/)
        const revoke = vi.spyOn(URL, 'revokeObjectURL')
        onError.mockClear()

        controller.commands.replaceFiles([
            makeFile('a.zip', 8, 'application/zip'),
            makeFile('b.exe', 8, 'application/x-msdownload'),
        ])
        await vi.waitFor(() =>
            expect(onRestrictionFailed).toHaveBeenCalledTimes(2),
        )

        expect(names(core)).toEqual(['keep.png'])
        expect(revoke).not.toHaveBeenCalledWith(kept?.url)
        expect(onError).toHaveBeenCalledTimes(2)
        controller.destroy()
        core.destroy()
    })

    it('a successful replaceFiles still revokes the previews it replaced', async () => {
        const { controller, core } = build({})
        await controller.commands.handleSetSelectedFiles([
            makeFile('old.png', 10),
        ])
        const [old] = [...core.files.values()]
        const revoke = vi.spyOn(URL, 'revokeObjectURL')

        controller.commands.replaceFiles([makeFile('new.png', 10)])
        await vi.waitFor(() => expect(names(core)).toEqual(['new.png']))

        expect(revoke).toHaveBeenCalledWith(old?.url)
        controller.destroy()
        core.destroy()
    })

    it('the onPrepareFiles re-add reports the refused file exactly once and uploads the rest', async () => {
        const onError = vi.fn()
        const onRestrictionFailed = vi.fn()
        const ok = makeFile('ok.png', 100)
        const tooBig = makeFile('big.png', 4096)
        const onPrepareFiles = vi.fn(async () => asUploadFiles([ok, tooBig]))
        const { controller, core, upload } = build({
            maxFileSize: { size: 1, unit: 'KB' },
            onPrepareFiles,
            onError,
            onRestrictionFailed,
        })
        controller.init()
        await controller.commands.handleSetSelectedFiles([
            makeFile('seed.png', 10),
        ])
        expect(onError).not.toHaveBeenCalled()

        await controller.commands.startUpload()

        expect(names(core)).toEqual(['ok.png'])
        expect(upload).toHaveBeenCalledTimes(1)
        expect(onError).toHaveBeenCalledTimes(1)
        expect(onRestrictionFailed).toHaveBeenCalledTimes(1)
        expect(onRestrictionFailed).toHaveBeenCalledWith(
            tooBig,
            UpupErrorCode.FILE_TOO_LARGE,
        )
        controller.destroy()
        core.destroy()
    })

    it('the onPrepareFiles re-add resolves without uploading when every prepared file is refused', async () => {
        const onError = vi.fn()
        const onRestrictionFailed = vi.fn()
        const { controller, core, upload } = build({
            allowedFileTypes: 'image/*',
            onPrepareFiles: async () =>
                asUploadFiles([
                    makeFile('a.zip', 8, 'application/zip'),
                    makeFile('b.exe', 8, 'application/x-msdownload'),
                ]),
            onError,
            onRestrictionFailed,
        })
        controller.init()
        await controller.commands.handleSetSelectedFiles([
            makeFile('seed.png', 10),
        ])

        await expect(controller.commands.startUpload()).resolves.toBeUndefined()

        expect(upload).not.toHaveBeenCalled()
        expect(onError).toHaveBeenCalledTimes(2)
        expect(onRestrictionFailed).toHaveBeenCalledTimes(2)
        controller.destroy()
        core.destroy()
    })
})
