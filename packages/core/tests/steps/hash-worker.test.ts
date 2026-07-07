import { describe, it, expect, vi } from 'vitest'
import { hashStep } from '../../src/steps/hash'
import type { UploadFile, PipelineContext } from '../../src/contracts'

const makeFile = (content = 'hello world'): UploadFile => {
    const f = new File([content], 'test.txt', { type: 'text/plain' })
    return Object.assign(f, {
        id: 't1',
        metadata: {},
        checksumSHA256: null,
    }) as unknown as UploadFile
}
const ctxBase = {
    files: new Map(),
    options: {} as Record<string, unknown>,
    emit: () => {},
    t: ((k: string) => k) as PipelineContext['t'],
}

describe('hashStep worker branch', () => {
    it('uses context.worker result when present', async () => {
        const execute = vi.fn(async () => ({
            kind: 'hash',
            checksum: 'cafebabe',
        }))
        const ctx: PipelineContext = {
            ...ctxBase,
            worker: { execute } as unknown as PipelineContext['worker'],
        }
        const out = await hashStep().process(makeFile(), ctx)
        expect(execute).toHaveBeenCalledWith(
            expect.objectContaining({ type: 'hash' }),
        )
        expect(out.checksumSHA256).toBe('cafebabe')
        expect(out.metadata!.checksum).toBe('cafebabe')
        expect(out.metadata!.originalContentHash).toBe('cafebabe')
    })

    it('falls back to the main thread when the worker throws', async () => {
        const execute = vi.fn(async () => {
            throw new Error('worker down')
        })
        const ctx: PipelineContext = { ...ctxBase, worker: { execute } }
        const out = await hashStep().process(makeFile(), ctx)
        expect(out.checksumSHA256).toBeDefined()
        expect(out.checksumSHA256!.length).toBe(64)
    })

    it('runs the main thread when no worker is present (regression)', async () => {
        const out = await hashStep().process(
            makeFile(),
            ctxBase as PipelineContext,
        )
        expect(out.checksumSHA256!.length).toBe(64)
    })
})
