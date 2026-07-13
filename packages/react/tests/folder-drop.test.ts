import { describe, expect, it } from 'vitest'
import { collectDroppedFiles } from '@useupup/core/internal'

function fileEntry(file: File, fullPath = `/${file.name}`) {
    return {
        isFile: true,
        isDirectory: false,
        fullPath,
        file: (resolve: (file: File) => void) => resolve(file),
    }
}

function directoryEntry(entries: unknown[]) {
    return {
        isFile: false,
        isDirectory: true,
        createReader: () => ({
            readEntries: (resolve: (entries: unknown[]) => void) =>
                resolve(entries),
        }),
    }
}

function dataTransfer(entries: unknown[], files: File[] = []) {
    return {
        items: entries.map(entry => ({
            webkitGetAsEntry: () => entry,
        })),
        files,
    } as unknown as DataTransfer
}

describe('collectDroppedFiles', () => {
    it('skips dropped directories when folderUpload.allowDrop is false', async () => {
        const nestedFile = new File(['hello'], 'nested.txt', {
            type: 'text/plain',
        })
        const result = await collectDroppedFiles(
            dataTransfer([
                directoryEntry([fileEntry(nestedFile, '/folder/nested.txt')]),
            ]),
            false,
        )

        expect(result.files).toEqual([])
        expect(result.skippedDirectory).toBe(true)
    })

    it('traverses dropped directories when folderUpload.allowDrop is true', async () => {
        const nestedFile = new File(['hello'], 'nested.txt', {
            type: 'text/plain',
        })
        const result = await collectDroppedFiles(
            dataTransfer([
                directoryEntry([fileEntry(nestedFile, '/folder/nested.txt')]),
            ]),
            true,
        )

        expect(result.files).toHaveLength(1)
        expect(result.files[0]!.name).toBe('nested.txt')
        expect(
            (result.files[0]! as unknown as Record<string, unknown>)
                .relativePath,
        ).toBe('folder/nested.txt')
        expect(result.skippedDirectory).toBe(false)
    })

    it('keeps dropped files while ignoring sibling directories when folder drop is disabled', async () => {
        const looseFile = new File(['loose'], 'loose.txt', {
            type: 'text/plain',
        })
        const nestedFile = new File(['nested'], 'nested.txt', {
            type: 'text/plain',
        })
        const result = await collectDroppedFiles(
            dataTransfer([
                fileEntry(looseFile),
                directoryEntry([fileEntry(nestedFile, '/folder/nested.txt')]),
            ]),
            false,
        )

        expect(result.files.map(file => file.name)).toEqual(['loose.txt'])
        expect(result.skippedDirectory).toBe(true)
    })
})
