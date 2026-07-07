import { describe, it, expect, vi } from 'vitest'
import { FileManager } from '../src/file-manager'
import { UploadStatus } from '../src/types/upload-status'
import type { UploadFile } from '@upup/core'

const makeNativeFile = (
    name = 'test.jpg',
    size = 1024,
    type = 'image/jpeg',
): File => {
    return new File(['x'.repeat(size)], name, { type })
}

describe('FileManager', () => {
    it('adds files and generates IDs', async () => {
        const fm = new FileManager({})
        const result = await fm.addFiles([
            makeNativeFile('a.jpg'),
            makeNativeFile('b.png'),
        ])
        expect(result).toHaveLength(2)
        expect(result[0]!.name).toBe('a.jpg')
        expect(result[1]!.name).toBe('b.png')
        expect(result[0]!.id).toBeDefined()
        expect(result[0]!.id).not.toBe(result[1]!.id)
    })

    it('rejects the whole batch when it exceeds the remaining file limit', async () => {
        const fm = new FileManager({ limit: 2 })
        await fm.addFiles([makeNativeFile('a.jpg')])
        await expect(
            fm.addFiles([makeNativeFile('b.jpg'), makeNativeFile('c.jpg')]),
        ).rejects.toThrow()
        expect([...fm.getFiles().values()]).toHaveLength(1)
    })

    it('rejects file additions when no slots remain', async () => {
        const fm = new FileManager({ limit: 1 })
        await fm.addFiles([makeNativeFile('a.jpg')])
        await expect(fm.addFiles([makeNativeFile('b.jpg')])).rejects.toThrow()
    })

    it('enforces accept filter', async () => {
        const fm = new FileManager({ allowedFileTypes: 'image/*' })
        await expect(
            fm.addFiles([makeNativeFile('doc.pdf', 100, 'application/pdf')]),
        ).rejects.toThrow()
    })

    it('enforces maxFileSize', async () => {
        const fm = new FileManager({ maxFileSize: { size: 500, unit: 'B' } })
        await expect(
            fm.addFiles([makeNativeFile('big.jpg', 1024)]),
        ).rejects.toThrow()
    })

    it('calls async onBeforeFileAdded and rejects on false', async () => {
        const fm = new FileManager({ onBeforeFileAdded: async () => false })
        const result = await fm.addFiles([makeNativeFile()])
        expect(result).toHaveLength(0)
    })

    it('calls async onBeforeFileAdded and accepts on true', async () => {
        const fm = new FileManager({ onBeforeFileAdded: async () => true })
        const result = await fm.addFiles([makeNativeFile()])
        expect(result).toHaveLength(1)
    })

    it('removes a file by ID', async () => {
        const fm = new FileManager({})
        const [file] = await fm.addFiles([makeNativeFile()])
        fm.removeFile(file!.id)
        expect(fm.getFiles().size).toBe(0)
    })

    it('removes all files', async () => {
        const fm = new FileManager({})
        await fm.addFiles([makeNativeFile('a.jpg'), makeNativeFile('b.jpg')])
        fm.removeAll()
        expect(fm.getFiles().size).toBe(0)
    })

    it('reorders files', async () => {
        const fm = new FileManager({})
        const files = await fm.addFiles([
            makeNativeFile('a.jpg'),
            makeNativeFile('b.jpg'),
            makeNativeFile('c.jpg'),
        ])
        const ids = files.map(f => f.id)
        // Move first to last: [a, b, c] -> [b, c, a]
        fm.reorderFiles([ids[1]!, ids[2]!, ids[0]!])
        const ordered = [...fm.getFiles().values()]
        expect(ordered[0]!.name).toBe('b.jpg')
        expect(ordered[2]!.name).toBe('a.jpg')
    })

    it('replaces all files with setFiles', async () => {
        const fm = new FileManager({})
        await fm.addFiles([makeNativeFile('old.jpg')])
        await fm.setFiles([makeNativeFile('new.jpg')])
        const files = [...fm.getFiles().values()]
        expect(files).toHaveLength(1)
        expect(files[0]!.name).toBe('new.jpg')
    })

    it('keeps existing files when setFiles validation fails', async () => {
        const fm = new FileManager({ allowedFileTypes: 'image/*' })
        await fm.addFiles([makeNativeFile('old.jpg')])
        await expect(
            fm.setFiles([makeNativeFile('doc.pdf', 100, 'application/pdf')]),
        ).rejects.toThrow()
        const files = [...fm.getFiles().values()]
        expect(files).toHaveLength(1)
        expect(files[0]!.name).toBe('old.jpg')
    })

    it('accepts files with read-only relativePath metadata', async () => {
        const fm = new FileManager({})
        const file = makeNativeFile('nested.jpg')
        Object.defineProperty(file, 'relativePath', {
            value: 'folder/nested.jpg',
            configurable: false,
            writable: false,
        })

        const [added] = await fm.addFiles([file])

        expect(added!.relativePath).toBe('folder/nested.jpg')
        // relativePath is mirrored into metadata at runtime (nativeToUploadFile) but
        // isn't part of the declared UploadFileMetadata shape — cast honestly here.
        expect(
            (added!.metadata as { relativePath?: string } | undefined)
                ?.relativePath,
        ).toBe('folder/nested.jpg')
    })

    it('revalidates files returned from onBeforeFileAdded', async () => {
        const fm = new FileManager({
            allowedFileTypes: 'image/*',
            onBeforeFileAdded: () =>
                makeNativeFile('doc.pdf', 100, 'application/pdf'),
        })
        await expect(
            fm.addFiles([makeNativeFile('original.jpg')]),
        ).rejects.toThrow()
        expect(fm.getFiles().size).toBe(0)
    })

    it('revokes object URLs on remove, replace, and clear', async () => {
        const createObjectURL = vi
            .spyOn(URL, 'createObjectURL')
            .mockImplementation(file => `blob:test-${(file as File).name}`)
        const revokeObjectURL = vi
            .spyOn(URL, 'revokeObjectURL')
            .mockImplementation(() => {})

        const fm = new FileManager({})
        const [removed] = await fm.addFiles([makeNativeFile('remove.jpg')])
        fm.removeFile(removed!.id)
        expect(revokeObjectURL).toHaveBeenCalledWith('blob:test-remove.jpg')

        const [replaced] = await fm.addFiles([
            makeNativeFile('replace-old.jpg'),
        ])
        fm.replaceFile(replaced!.id, makeNativeFile('replace-new.jpg'))
        expect(revokeObjectURL).toHaveBeenCalledWith(
            'blob:test-replace-old.jpg',
        )

        await fm.addFiles([makeNativeFile('clear.jpg')])
        fm.removeAll()
        expect(revokeObjectURL).toHaveBeenCalledWith(
            'blob:test-replace-new.jpg',
        )
        expect(revokeObjectURL).toHaveBeenCalledWith('blob:test-clear.jpg')

        createObjectURL.mockRestore()
        revokeObjectURL.mockRestore()
    })

    // ─────────────────────────────────────────────────────────────
    // P20 / F-143 — FileManager owns the two remaining bulk writes
    // ─────────────────────────────────────────────────────────────
    describe('applyProcessed (P20 / F-143)', () => {
        it('patches an existing entry in place without changing the map size', async () => {
            const fm = new FileManager({})
            const [existing] = await fm.addFiles([makeNativeFile('a.jpg')])
            const patched = {
                ...existing,
                status: UploadStatus.SUCCESSFUL,
                key: 'k',
            } as UploadFile

            fm.applyProcessed([patched])

            expect(fm.getFiles().size).toBe(1)
            expect(fm.getFiles().get(existing!.id)).toEqual(patched)
        })

        it('adds a file carrying a new id', async () => {
            const fm = new FileManager({})
            await fm.addFiles([makeNativeFile('a.jpg')])
            const extra = {
                ...(await fm.addFiles([makeNativeFile('b.jpg')]))[0],
                id: 'brand-new-id',
            } as UploadFile

            fm.applyProcessed([extra])

            expect(fm.getFiles().size).toBe(3)
            expect(fm.getFiles().get('brand-new-id')).toEqual(extra)
        })
    })

    describe('restore (P20 / F-143)', () => {
        it('clears existing entries and repopulates from exactly the given snapshot', async () => {
            const fm = new FileManager({})
            await fm.addFiles([makeNativeFile('stale.jpg')])
            const [f1] = await fm.addFiles([makeNativeFile('one.jpg')])
            const [f2] = await fm.addFiles([makeNativeFile('two.jpg')])

            fm.restore([
                [f1!.id, f1!],
                [f2!.id, f2!],
            ])

            const files = fm.getFiles()
            expect(files.size).toBe(2)
            expect(files.get(f1!.id)).toBe(f1)
            expect(files.get(f2!.id)).toBe(f2)
        })

        it('does not throw on an empty snapshot and does not revoke incoming files', async () => {
            const revokeObjectURL = vi
                .spyOn(URL, 'revokeObjectURL')
                .mockImplementation(() => {})
            const fm = new FileManager({})
            const [file] = await fm.addFiles([makeNativeFile('kept.jpg')])

            expect(() => fm.restore([[file!.id, file!]])).not.toThrow()
            expect(revokeObjectURL).not.toHaveBeenCalled()

            revokeObjectURL.mockRestore()
        })
    })

    describe('getFiles read-only view (P20 / F-143)', () => {
        it('returns a distinct object on every call', async () => {
            const fm = new FileManager({})
            await fm.addFiles([makeNativeFile('a.jpg')])

            expect(fm.getFiles()).not.toBe(fm.getFiles())
        })

        it('mutating the returned map does not affect FileManager state', async () => {
            const fm = new FileManager({})
            await fm.addFiles([makeNativeFile('a.jpg')])

            const snap = fm.getFiles() as Map<string, UploadFile>
            snap.set('bogus', {} as UploadFile)

            expect(fm.getFiles().has('bogus')).toBe(false)
            expect(fm.getFiles().size).toBe(1)
        })
    })
})
