import { describe, it, expect } from 'vitest'
import { UpupCore } from '../src/core'
import type { UploadOptions } from '../src/core'

// UpupCore.fileOverrides is a private implementation detail; these tests do
// white-box assertions on it, so cast at that boundary instead of widening
// its real type (Map<string, Partial<UploadOptions>>, per src/core.ts).
type CoreWithOverrides = { fileOverrides: Map<string, Partial<UploadOptions>> }

describe('addFiles with overrides', () => {
    it('should store per-batch overrides for later use in upload', async () => {
        const core = new UpupCore({})

        const f1 = new File(['hello'], 'test.txt', { type: 'text/plain' })
        await core.addFiles([f1], { checksumVerification: true, maxRetries: 5 })

        // Overrides should be stored internally
        const overrides = (core as unknown as CoreWithOverrides).fileOverrides
        expect(overrides).toBeDefined()
        const fileId = [...core.files.keys()][0]
        expect(overrides.get(fileId!)).toEqual({
            checksumVerification: true,
            maxRetries: 5,
        })

        core.destroy()
    })

    it('should pass overrides metadata through to upload', async () => {
        const core = new UpupCore({})

        const f1 = new File(['hello'], 'test.txt', { type: 'text/plain' })
        await core.addFiles([f1], { metadata: { customKey: 'customValue' } })

        const overrides = (core as unknown as CoreWithOverrides).fileOverrides
        const fileId = [...core.files.keys()][0]
        expect(overrides.get(fileId!)?.metadata).toEqual({
            customKey: 'customValue',
        })

        core.destroy()
    })

    it('should clean up overrides when file is removed', async () => {
        const core = new UpupCore({})

        const f1 = new File(['hello'], 'test.txt', { type: 'text/plain' })
        await core.addFiles([f1], { maxRetries: 3 })

        const fileId = [...core.files.keys()][0]
        core.removeFile(fileId!)

        const overrides = (core as unknown as CoreWithOverrides).fileOverrides
        expect(overrides.has(fileId!)).toBe(false)

        core.destroy()
    })

    it('should clean up all overrides on removeAll', async () => {
        const core = new UpupCore({})

        const f1 = new File(['a'], 'a.txt', { type: 'text/plain' })
        const f2 = new File(['b'], 'b.txt', { type: 'text/plain' })
        await core.addFiles([f1, f2], { maxRetries: 3 })

        core.removeAll()

        const overrides = (core as unknown as CoreWithOverrides).fileOverrides
        expect(overrides.size).toBe(0)

        core.destroy()
    })
})
