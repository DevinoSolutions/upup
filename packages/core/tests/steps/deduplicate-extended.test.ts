import { describe, it, expect, vi } from 'vitest'
import { deduplicateStep } from '../../src/steps/deduplicate'
import type { UploadFile, PipelineContext } from '@upup/core'

function makeFile(id: string, name: string, size = 100): UploadFile {
    return {
        id,
        name,
        size,
        type: 'text/plain',
        lastModified: 0,
        url: null,
        relativePath: null,
        key: null,
        fileHash: null,
        checksumSHA256: null,
        etag: null,
        thumbnail: null,
        arrayBuffer: vi.fn(),
        slice: vi.fn(),
        stream: vi.fn(),
        text: vi.fn(),
    } as unknown as UploadFile
}

function makeContext(files: [string, UploadFile][]): PipelineContext {
    return {
        files: new Map(files),
        options: {} as any,
        emit: vi.fn(),
        t: ((k: string) => k) as any,
    }
}

describe('deduplicateStep — extended', () => {
    it('allows file when context has no existing files', async () => {
        const step = deduplicateStep()
        const file = makeFile('new-1', 'doc.txt', 200)
        const result = await step.process(file, makeContext([]))
        expect(result).toBe(file)
    })

    it('allows file with same name but different size', async () => {
        const step = deduplicateStep()
        const existing = makeFile('e1', 'report.pdf', 500)
        const incoming = makeFile('i1', 'report.pdf', 600)
        const result = await step.process(incoming, makeContext([['e1', existing]]))
        expect(result).toBe(incoming)
    })

    it('allows file with same size but different name', async () => {
        const step = deduplicateStep()
        const existing = makeFile('e1', 'a.txt', 100)
        const incoming = makeFile('i1', 'b.txt', 100)
        const result = await step.process(incoming, makeContext([['e1', existing]]))
        expect(result).toBe(incoming)
    })

    it('rejects file with same name AND size as existing', async () => {
        const step = deduplicateStep()
        const existing = makeFile('e1', 'dup.txt', 100)
        const incoming = makeFile('i1', 'dup.txt', 100)
        await expect(
            step.process(incoming, makeContext([['e1', existing]])),
        ).rejects.toThrow('Duplicate file')
    })

    it('throws UpupValidationError with DUPLICATE code', async () => {
        const step = deduplicateStep()
        const existing = makeFile('e1', 'dup.txt', 100)
        const incoming = makeFile('i1', 'dup.txt', 100)
        try {
            await step.process(incoming, makeContext([['e1', existing]]))
            expect.fail('should have thrown')
        } catch (e: any) {
            expect(e.name).toBe('UpupValidationError')
            expect(e.code).toBe('DUPLICATE')
            expect(e.reason).toBe('DUPLICATE')
        }
    })

    it('does not compare file against itself in context', async () => {
        const step = deduplicateStep()
        const file = makeFile('self', 'me.txt', 100)
        // File exists in context with same id — should NOT be flagged
        const result = await step.process(file, makeContext([['self', file]]))
        expect(result).toBe(file)
    })

    it('checks against multiple existing files', async () => {
        const step = deduplicateStep()
        const files: [string, UploadFile][] = [
            ['e1', makeFile('e1', 'a.txt', 100)],
            ['e2', makeFile('e2', 'b.txt', 200)],
            ['e3', makeFile('e3', 'c.txt', 300)],
        ]
        // Incoming matches e2
        const incoming = makeFile('i1', 'b.txt', 200)
        await expect(
            step.process(incoming, makeContext(files)),
        ).rejects.toThrow('Duplicate')
    })

    it('allows file when no match in large context', async () => {
        const step = deduplicateStep()
        const files: [string, UploadFile][] = Array.from({ length: 20 }, (_, i) => [
            `e${i}`,
            makeFile(`e${i}`, `file-${i}.txt`, i * 10),
        ])
        const incoming = makeFile('new', 'unique.txt', 999)
        const result = await step.process(incoming, makeContext(files))
        expect(result).toBe(incoming)
    })

    it('error message includes the filename', async () => {
        const step = deduplicateStep()
        const existing = makeFile('e1', 'important.docx', 500)
        const incoming = makeFile('i1', 'important.docx', 500)
        await expect(
            step.process(incoming, makeContext([['e1', existing]])),
        ).rejects.toThrow('important.docx')
    })
})
