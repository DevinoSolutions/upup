import { describe, it, expect } from 'vitest'
import { UpupCore } from '../src/core'

const makeFile = (name: string, size: number, type: string) =>
    new File(['x'.repeat(size)], name, { type })

// ─────────────────────────────────────────────
// validateFiles — extended scenarios
// ─────────────────────────────────────────────
describe('UpupCore.validateFiles — extended', () => {
    it('returns valid for file matching wildcard accept', async () => {
        const core = new UpupCore({ allowedFileTypes: 'image/*' })
        const results = await core.validateFiles([
            makeFile('photo.jpg', 100, 'image/jpeg'),
        ])
        expect(results[0]!.valid).toBe(true)
        core.destroy()
    })

    it('rejects file below minFileSize', async () => {
        const core = new UpupCore({ minFileSize: { size: 100, unit: 'B' } })
        const results = await core.validateFiles([
            makeFile('tiny.txt', 5, 'text/plain'),
        ])
        expect(results[0]!.valid).toBe(false)
        expect(results[0]!.errors[0]!.code).toBe('FILE_TOO_SMALL')
        core.destroy()
    })

    it('returns valid when file meets minFileSize', async () => {
        const core = new UpupCore({ minFileSize: { size: 5, unit: 'B' } })
        const results = await core.validateFiles([
            makeFile('ok.txt', 50, 'text/plain'),
        ])
        expect(results[0]!.valid).toBe(true)
        core.destroy()
    })

    it('validates against both accept and maxFileSize simultaneously', async () => {
        const core = new UpupCore({
            allowedFileTypes: 'text/plain',
            maxFileSize: { size: 10, unit: 'B' },
        })

        const goodFile = makeFile('ok.txt', 5, 'text/plain')
        const wrongType = makeFile('bad.png', 5, 'image/png')
        const tooBig = makeFile('huge.txt', 50, 'text/plain')
        const bothBad = makeFile('huge.png', 50, 'image/png')

        const results = await core.validateFiles([
            goodFile,
            wrongType,
            tooBig,
            bothBad,
        ])
        expect(results[0]!.valid).toBe(true)
        expect(results[1]!.valid).toBe(false) // wrong type
        expect(results[2]!.valid).toBe(false) // too big
        expect(results[3]!.valid).toBe(false) // both wrong
        core.destroy()
    })

    it('returns empty array for empty input', async () => {
        const core = new UpupCore({})
        const results = await core.validateFiles([])
        expect(results).toHaveLength(0)
        core.destroy()
    })

    it('accepts all files when no restrictions are set', async () => {
        const core = new UpupCore({})
        const results = await core.validateFiles([
            makeFile('a.txt', 100, 'text/plain'),
            makeFile('b.png', 200, 'image/png'),
            makeFile('c.pdf', 300, 'application/pdf'),
        ])
        expect(results.every(r => r.valid)).toBe(true)
        core.destroy()
    })

    it('file reference in result matches input file', async () => {
        const core = new UpupCore({})
        const file = makeFile('ref.txt', 10, 'text/plain')
        const results = await core.validateFiles([file])
        expect(results[0]!.file).toBe(file)
        core.destroy()
    })

    it('accepts extension-based accept (.pdf)', async () => {
        const core = new UpupCore({ allowedFileTypes: '.pdf' })
        const results = await core.validateFiles([
            makeFile('report.pdf', 10, 'application/pdf'),
        ])
        expect(results[0]!.valid).toBe(true)
        core.destroy()
    })

    it('rejects file not matching extension-based accept', async () => {
        const core = new UpupCore({ allowedFileTypes: '.pdf' })
        const results = await core.validateFiles([
            makeFile('photo.jpg', 10, 'image/jpeg'),
        ])
        expect(results[0]!.valid).toBe(false)
        core.destroy()
    })

    it('errors array has correct structure', async () => {
        const core = new UpupCore({ allowedFileTypes: 'text/plain' })
        const results = await core.validateFiles([
            makeFile('bad.png', 10, 'image/png'),
        ])
        const error = results[0]!.errors[0]
        expect(error).toHaveProperty('code')
        expect(error).toHaveProperty('message')
        expect(typeof error!.code).toBe('string')
        expect(typeof error!.message).toBe('string')
        core.destroy()
    })
})
