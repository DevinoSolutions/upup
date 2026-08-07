import { describe, it, expect } from 'vitest'
import { UpupCore } from '../src/core'

describe('UpupCore.validateFiles', () => {
    it('should return valid results for acceptable files', async () => {
        const core = new UpupCore({
            allowedFileTypes: 'text/plain',
            maxFileSize: { size: 1, unit: 'MB' },
        })

        const f1 = new File(['hello'], 'test.txt', { type: 'text/plain' })
        const results = await core.validateFiles([f1])

        expect(results).toHaveLength(1)
        expect(results[0]!.valid).toBe(true)
        expect(results[0]!.file).toBe(f1)
        expect(results[0]!.errors).toEqual([])

        core.destroy()
    })

    it('should return invalid result for wrong file type', async () => {
        const core = new UpupCore({
            allowedFileTypes: 'text/plain',
        })

        const f1 = new File(['hello'], 'test.png', { type: 'image/png' })
        const results = await core.validateFiles([f1])

        expect(results).toHaveLength(1)
        expect(results[0]!.valid).toBe(false)
        expect(results[0]!.errors.length).toBeGreaterThan(0)
        expect(results[0]!.errors[0]!.code).toBe('TYPE_MISMATCH')

        core.destroy()
    })

    it('should return invalid result for file exceeding size limit', async () => {
        const core = new UpupCore({
            maxFileSize: { size: 1, unit: 'B' },
        })

        const f1 = new File(['hello world'], 'test.txt', { type: 'text/plain' })
        const results = await core.validateFiles([f1])

        expect(results).toHaveLength(1)
        expect(results[0]!.valid).toBe(false)
        expect(results[0]!.errors[0]!.code).toBe('FILE_TOO_LARGE')

        core.destroy()
    })

    // Multi-file independence (mixed validity across one array) is pinned by
    // validate-files-extended's "validates against both accept and maxFileSize
    // simultaneously", which asserts per-index validity over three files.
    it('should not modify the internal file list', async () => {
        const core = new UpupCore({})
        const f1 = new File(['hello'], 'test.txt', { type: 'text/plain' })

        await core.validateFiles([f1])
        expect(core.files.size).toBe(0) // validateFiles is read-only

        core.destroy()
    })
})
