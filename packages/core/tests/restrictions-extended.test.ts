import { describe, it, expect, vi } from 'vitest'
import { UpupCore } from '../src/core'

const makeFile = (name: string, size: number, type = 'text/plain') =>
    new File(['x'.repeat(size)], name, { type })

// ─────────────────────────────────────────────
// maxFileSize enforcement
// ─────────────────────────────────────────────
describe('Restrictions — maxFileSize', () => {
    it('rejects a file exceeding maxFileSize', async () => {
        const core = new UpupCore({ maxFileSize: { size: 10, unit: 'B' } })
        await expect(core.addFiles([makeFile('big.txt', 20)])).rejects.toThrow()
        expect(core.files.size).toBe(0)
        core.destroy()
    })

    it('accepts a file within maxFileSize', async () => {
        const core = new UpupCore({ maxFileSize: { size: 100, unit: 'B' } })
        await core.addFiles([makeFile('small.txt', 50)])
        expect(core.files.size).toBe(1)
        core.destroy()
    })

    it('accepts a file exactly at maxFileSize', async () => {
        const core = new UpupCore({ maxFileSize: { size: 10, unit: 'B' } })
        await core.addFiles([makeFile('exact.txt', 10)])
        expect(core.files.size).toBe(1)
        core.destroy()
    })
})

// ─────────────────────────────────────────────
// minFileSize enforcement
// ─────────────────────────────────────────────
describe('Restrictions — minFileSize', () => {
    it('rejects a file below minFileSize', async () => {
        const core = new UpupCore({ minFileSize: { size: 100, unit: 'B' } })
        await expect(core.addFiles([makeFile('tiny.txt', 5)])).rejects.toThrow()
        expect(core.files.size).toBe(0)
        core.destroy()
    })

    it('accepts a file above minFileSize', async () => {
        const core = new UpupCore({ minFileSize: { size: 5, unit: 'B' } })
        await core.addFiles([makeFile('ok.txt', 50)])
        expect(core.files.size).toBe(1)
        core.destroy()
    })
})

// ─────────────────────────────────────────────
// accept / allowedFileTypes
// ─────────────────────────────────────────────
describe('Restrictions — accept types', () => {
    it('rejects file with wrong MIME type', async () => {
        const core = new UpupCore({ allowedFileTypes: 'image/png' })
        await expect(
            core.addFiles([makeFile('doc.txt', 10, 'text/plain')]),
        ).rejects.toThrow()
        core.destroy()
    })

    it('accepts file matching MIME type', async () => {
        const core = new UpupCore({ allowedFileTypes: 'text/plain' })
        await core.addFiles([makeFile('doc.txt', 10, 'text/plain')])
        expect(core.files.size).toBe(1)
        core.destroy()
    })

    it('accepts file matching wildcard MIME (image/*)', async () => {
        const core = new UpupCore({ allowedFileTypes: 'image/*' })
        await core.addFiles([makeFile('photo.jpg', 10, 'image/jpeg')])
        expect(core.files.size).toBe(1)
        core.destroy()
    })

    it('accepts file matching extension (.pdf)', async () => {
        const core = new UpupCore({ allowedFileTypes: '.pdf' })
        await core.addFiles([makeFile('report.pdf', 10, 'application/pdf')])
        expect(core.files.size).toBe(1)
        core.destroy()
    })

    it('accepts from comma-separated accept list', async () => {
        const core = new UpupCore({
            allowedFileTypes: 'image/png, text/plain, .pdf',
        })
        await core.addFiles([makeFile('doc.txt', 10, 'text/plain')])
        expect(core.files.size).toBe(1)
        core.destroy()
    })
})

// ─────────────────────────────────────────────
// limit / maxNumberOfFiles
// ─────────────────────────────────────────────
describe('Restrictions — file count limit', () => {
    it('rejects when adding beyond limit', async () => {
        const core = new UpupCore({ limit: 2 })
        await core.addFiles([makeFile('a.txt', 5), makeFile('b.txt', 5)])
        await expect(core.addFiles([makeFile('c.txt', 5)])).rejects.toThrow()
        expect(core.files.size).toBe(2)
        core.destroy()
    })

    it('accepts up to the limit', async () => {
        const core = new UpupCore({ limit: 3 })
        await core.addFiles([makeFile('a.txt', 5)])
        await core.addFiles([makeFile('b.txt', 5)])
        await core.addFiles([makeFile('c.txt', 5)])
        expect(core.files.size).toBe(3)
        core.destroy()
    })
})

// ─────────────────────────────────────────────
// multiple add calls
// ─────────────────────────────────────────────
describe('Restrictions — multiple add calls', () => {
    it('accumulates files across multiple addFiles calls', async () => {
        const core = new UpupCore({})
        await core.addFiles([makeFile('a.txt', 10)])
        await core.addFiles([makeFile('b.txt', 10)])
        expect(core.files.size).toBe(2)
        core.destroy()
    })

    it('core assigns unique IDs so same-name files are both kept', async () => {
        const core = new UpupCore({})
        await core.addFiles([makeFile('file.txt', 10)])
        await core.addFiles([makeFile('file.txt', 10)])
        expect(core.files.size).toBe(2)
        core.destroy()
    })
})

// ─────────────────────────────────────────────
// onBeforeFileAdded
// ─────────────────────────────────────────────
describe('Restrictions — onBeforeFileAdded', () => {
    it('rejects when callback returns false', async () => {
        const core = new UpupCore({ onBeforeFileAdded: async () => false })
        const handler = vi.fn()
        core.on('file-rejected', handler)
        await core.addFiles([makeFile('x.txt', 5)])
        expect(core.files.size).toBe(0)
        core.destroy()
    })

    it('accepts when callback returns true', async () => {
        const core = new UpupCore({ onBeforeFileAdded: async () => true })
        await core.addFiles([makeFile('x.txt', 5)])
        expect(core.files.size).toBe(1)
        core.destroy()
    })

    it('accepts when callback returns a File object', async () => {
        const replacement = makeFile('replaced.txt', 5, 'text/plain')
        const core = new UpupCore({
            onBeforeFileAdded: async () => replacement,
        })
        await core.addFiles([makeFile('original.txt', 5)])
        expect(core.files.size).toBe(1)
        core.destroy()
    })
})
