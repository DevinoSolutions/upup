import { describe, it, expect, vi } from 'vitest'
import { hashStep } from '../../src/steps/hash'
import type { UploadFile, PipelineContext } from '@upup/shared'

function makeFile(content: string, id = 'f1'): UploadFile {
    const file = new File([content], 'test.txt', { type: 'text/plain' })
    return Object.assign(file, {
        id,
        url: null,
        relativePath: null,
        key: null,
        fileHash: null,
        checksumSHA256: null,
        etag: null,
        thumbnail: null,
    }) as unknown as UploadFile
}

const ctx: PipelineContext = {
    files: new Map(),
    options: {} as any,
    emit: () => {},
    t: ((k: string) => k) as any,
}

describe('hashStep — extended', () => {
    it('sets file.metadata.checksum to the SHA-256 hash', async () => {
        const step = hashStep()
        const file = makeFile('hello')
        const result = await step.process(file, ctx)
        expect((result as any).metadata.checksum).toBeDefined()
        expect((result as any).metadata.checksum).toBe(result.checksumSHA256)
    })

    it('sets file.metadata.originalContentHash', async () => {
        const step = hashStep()
        const file = makeFile('content')
        const result = await step.process(file, ctx)
        expect((result as any).metadata.originalContentHash).toBeDefined()
        expect((result as any).metadata.originalContentHash).toBe(result.checksumSHA256)
    })

    it('preserves existing metadata fields', async () => {
        const step = hashStep()
        const file = makeFile('data')
        ;(file as any).metadata = { custom: 'value' }
        const result = await step.process(file, ctx)
        expect((result as any).metadata.custom).toBe('value')
        expect((result as any).metadata.checksum).toBeDefined()
    })

    it('hash is lowercase hex', async () => {
        const step = hashStep()
        const result = await step.process(makeFile('test'), ctx)
        expect(/^[0-9a-f]{64}$/.test(result.checksumSHA256!)).toBe(true)
    })

    it('returns the same file reference (mutated)', async () => {
        const step = hashStep()
        const file = makeFile('ref')
        const result = await step.process(file, ctx)
        expect(result).toBe(file)
    })

    it('handles empty file content', async () => {
        const step = hashStep()
        const file = makeFile('')
        const result = await step.process(file, ctx)
        expect(result.checksumSHA256).toHaveLength(64)
    })

    it('has no shouldProcess guard (processes all files)', () => {
        const step = hashStep()
        expect(step.shouldProcess).toBeUndefined()
    })
})
