import { describe, it, expect, vi } from 'vitest'
import { UpupCore } from '../src/core'
import { UpupErrorCode, UpupValidationError } from '../src/errors'

const makeFile = (name: string, size = 10, type = 'text/plain') =>
    new File(['x'.repeat(size)], name, { type })

const failures = (core: UpupCore) => {
    const seen: UpupValidationError[] = []
    core.on('restriction-failed', ({ error }) => {
        seen.push(error as UpupValidationError)
    })
    return seen
}

describe('restriction-failed carries the structured reason of each refusal', () => {
    it('addFiles reports a too-large file as FILE_TOO_LARGE on its UpupValidationError', async () => {
        const core = new UpupCore({ maxFileSize: { size: 5, unit: 'B' } })
        const seen = failures(core)
        const big = makeFile('Unlimited_CV.pdf', 50, 'application/pdf')

        await expect(core.addFiles([big])).rejects.toBeInstanceOf(
            UpupValidationError,
        )

        expect(seen).toHaveLength(1)
        expect(seen[0]).toBeInstanceOf(UpupValidationError)
        expect(seen[0]?.reason).toBe(UpupErrorCode.FILE_TOO_LARGE)
        expect(seen[0]?.file).toBe(big)
        core.destroy()
    })

    it('addFiles reports an over-total batch once as TOTAL_SIZE_EXCEEDED, not as a per-file size', async () => {
        const core = new UpupCore({ maxTotalFileSize: { size: 15, unit: 'B' } })
        const seen = failures(core)

        await expect(
            core.addFiles([makeFile('a.txt', 10), makeFile('b.txt', 10)]),
        ).rejects.toBeInstanceOf(UpupValidationError)

        expect(seen.map(e => e.reason)).toEqual([
            UpupErrorCode.TOTAL_SIZE_EXCEEDED,
        ])
        expect(seen[0]?.file.name).toBe('a.txt')
        expect(core.files.size).toBe(0)
        core.destroy()
    })

    it('addFiles reports a batch over the count limit once as LIMIT_EXCEEDED', async () => {
        const core = new UpupCore({ limit: 1 })
        const seen = failures(core)

        await expect(
            core.addFiles([makeFile('a.txt'), makeFile('b.txt')]),
        ).rejects.toBeInstanceOf(UpupValidationError)

        expect(seen.map(e => e.reason)).toEqual([UpupErrorCode.LIMIT_EXCEEDED])
        expect(core.files.size).toBe(0)
        core.destroy()
    })
})

describe('restriction-failed fires for refusals only', () => {
    it('addFiles does not emit it when onBeforeFileAdded throws an ordinary error', async () => {
        const core = new UpupCore({
            onBeforeFileAdded: () => {
                throw new Error('hook blew up')
            },
        })
        const handler = vi.fn()
        core.on('restriction-failed', handler)

        await expect(core.addFiles([makeFile('a.txt')])).rejects.toThrow(
            'hook blew up',
        )

        expect(handler).not.toHaveBeenCalled()
        core.destroy()
    })

    it('setFiles emits it for a refused file', async () => {
        const core = new UpupCore({ allowedFileTypes: 'image/*' })
        const seen = failures(core)

        await expect(
            core.setFiles([makeFile('notes.txt', 4, 'text/plain')]),
        ).rejects.toBeInstanceOf(UpupValidationError)

        expect(seen.map(e => e.reason)).toEqual([UpupErrorCode.TYPE_MISMATCH])
        core.destroy()
    })

    it('setFiles does not emit it when onBeforeFileAdded throws an ordinary error', async () => {
        const core = new UpupCore({
            onBeforeFileAdded: () => {
                throw new Error('hook blew up')
            },
        })
        const handler = vi.fn()
        core.on('restriction-failed', handler)

        await expect(core.setFiles([makeFile('a.txt')])).rejects.toThrow(
            'hook blew up',
        )

        expect(handler).not.toHaveBeenCalled()
        core.destroy()
    })

    it('a refused setFiles leaves the current selection untouched', async () => {
        const core = new UpupCore({ allowedFileTypes: 'image/*' })
        await core.addFiles([makeFile('keep.png', 4, 'image/png')])

        await expect(
            core.setFiles([makeFile('notes.txt', 4, 'text/plain')]),
        ).rejects.toBeInstanceOf(UpupValidationError)

        expect([...core.files.values()].map(f => f.name)).toEqual(['keep.png'])
        core.destroy()
    })
})

describe('a mixed batch keeps the acceptable files', () => {
    const png = () => makeFile('photo.png', 4, 'image/png')
    const zip = () => makeFile('bundle.zip', 4, 'application/zip')
    const exe = () => makeFile('setup.exe', 4, 'application/x-msdownload')

    it('addFiles queues the png, reports the zip and the exe, and resolves', async () => {
        const core = new UpupCore({ allowedFileTypes: 'image/*' })
        const seen = failures(core)
        const added = vi.fn()
        core.on('files-added', added)

        await expect(core.addFiles([zip(), exe(), png()])).resolves.toBe(
            undefined,
        )

        expect([...core.files.values()].map(f => f.name)).toEqual(['photo.png'])
        expect(added).toHaveBeenCalledTimes(1)
        expect(seen.map(e => e.file.name).sort()).toEqual([
            'bundle.zip',
            'setup.exe',
        ])
        expect(seen.every(e => e.reason === UpupErrorCode.TYPE_MISMATCH)).toBe(
            true,
        )
        core.destroy()
    })

    it('addFiles still rejects when every file in the batch is refused', async () => {
        const core = new UpupCore({ allowedFileTypes: 'image/*' })
        const seen = failures(core)

        await expect(core.addFiles([zip(), exe()])).rejects.toBeInstanceOf(
            UpupValidationError,
        )

        expect(core.files.size).toBe(0)
        expect(seen).toHaveLength(2)
        core.destroy()
    })

    it('setFiles replaces the selection with the acceptable files and reports the rest', async () => {
        const core = new UpupCore({ allowedFileTypes: 'image/*' })
        const seen = failures(core)

        await expect(core.setFiles([zip(), png(), exe()])).resolves.toBe(
            undefined,
        )

        expect([...core.files.values()].map(f => f.name)).toEqual(['photo.png'])
        expect(seen).toHaveLength(2)
        core.destroy()
    })

    it('a refused file does not count against the batch limit of the files that remain', async () => {
        const core = new UpupCore({ allowedFileTypes: 'image/*', limit: 2 })
        const seen = failures(core)

        await core.addFiles([zip(), png(), makeFile('b.png', 4, 'image/png')])

        expect([...core.files.values()].map(f => f.name)).toEqual([
            'photo.png',
            'b.png',
        ])
        expect(seen.map(e => e.reason)).toEqual([UpupErrorCode.TYPE_MISMATCH])
        core.destroy()
    })

    it('an acceptable remainder over the limit is refused together, beside the per-file refusals', async () => {
        const core = new UpupCore({ allowedFileTypes: 'image/*', limit: 1 })
        const seen = failures(core)

        await expect(
            core.addFiles([zip(), png(), makeFile('b.png', 4, 'image/png')]),
        ).rejects.toBeInstanceOf(UpupValidationError)

        expect(core.files.size).toBe(0)
        expect(seen.map(e => e.reason)).toEqual([
            UpupErrorCode.TYPE_MISMATCH,
            UpupErrorCode.LIMIT_EXCEEDED,
        ])
        core.destroy()
    })
})
