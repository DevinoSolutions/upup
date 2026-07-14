import { describe, it, expect } from 'vitest'
import { collectDroppedFiles } from '../src/folder-drop'

describe('collectDroppedFiles', () => {
    it('returns empty when dataTransfer has no files or items', async () => {
        const dt = {
            files: [] as unknown as FileList,
            items: [] as unknown as DataTransferItemList,
        }
        const result = await collectDroppedFiles(dt, false)
        expect(result.files).toHaveLength(0)
        expect(result.skippedDirectory).toBe(false)
    })

    it('falls back to dataTransfer.files when no items support entries', async () => {
        const file = new File(['content'], 'test.txt', { type: 'text/plain' })
        const fileList = [file] as unknown as FileList
        Object.defineProperty(fileList, Symbol.iterator, {
            value: Array.prototype[Symbol.iterator],
        })
        const dt = {
            files: fileList,
            items: [] as unknown as DataTransferItemList,
        }
        const result = await collectDroppedFiles(dt, false)
        expect(result.files).toHaveLength(1)
        expect(result.files[0]!.name).toBe('test.txt')
    })
})
