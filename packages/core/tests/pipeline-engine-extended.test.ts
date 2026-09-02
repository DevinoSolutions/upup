import { describe, it, expect, vi } from 'vitest'
import { PipelineEngine } from '../src/pipeline/engine'
import type { PipelineStep, PipelineContext, UploadFile } from '@useupup/core'

function makeFile(id: string, type = 'text/plain'): UploadFile {
    return {
        id,
        name: `${id}.txt`,
        size: 10,
        type,
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

function makeContext(
    overrides: Partial<PipelineContext> = {},
): PipelineContext {
    return {
        files: new Map(),
        options: {},
        emit: vi.fn(),
        t: (k: string) => k,
        ...overrides,
    }
}

const passthroughStep: PipelineStep = {
    name: 'passthrough',
    process: async file => file,
}

// ─────────────────────────────────────────────
// processAll
// ─────────────────────────────────────────────
describe('PipelineEngine — processAll', () => {
    it('returns an array of the same length as input', async () => {
        const engine = new PipelineEngine([passthroughStep])
        const files = [makeFile('a'), makeFile('b'), makeFile('c')]
        const results = await engine.processAll(files, makeContext())
        expect(results).toHaveLength(3)
    })

    it('processes each file through the pipeline', async () => {
        const processed: string[] = []
        const step: PipelineStep = {
            name: 'track',
            process: async file => {
                processed.push(file.id)
                return file
            },
        }
        const engine = new PipelineEngine([step])
        await engine.processAll([makeFile('x'), makeFile('y')], makeContext())
        expect(processed).toEqual(['x', 'y'])
    })

    it('preserves mutations applied by steps across all files', async () => {
        const step: PipelineStep = {
            name: 'stamp',
            process: async file =>
                Object.assign(file, { fileHash: `hash-${file.id}` }),
        }
        const engine = new PipelineEngine([step])
        const results = await engine.processAll(
            [makeFile('p'), makeFile('q')],
            makeContext(),
        )
        expect(results[0]!.fileHash).toBe('hash-p')
        expect(results[1]!.fileHash).toBe('hash-q')
    })

    it('returns an empty array for empty input', async () => {
        const engine = new PipelineEngine([passthroughStep])
        const results = await engine.processAll([], makeContext())
        expect(results).toHaveLength(0)
    })

    it('emits events for each file independently', async () => {
        const emit = vi.fn()
        const engine = new PipelineEngine([passthroughStep])
        await engine.processAll(
            [makeFile('f1'), makeFile('f2')],
            makeContext({ emit }),
        )
        // pipeline-start + pipeline-step + pipeline-complete per file = 6 calls total
        expect(emit).toHaveBeenCalledTimes(6)
    })

    it('skips steps that fail shouldProcess for specific files', async () => {
        const processFn = vi.fn(async (file: UploadFile) => file)
        const step: PipelineStep = {
            name: 'images-only',
            shouldProcess: file => file.type.startsWith('image/'),
            process: processFn,
        }
        const engine = new PipelineEngine([step])
        const files = [
            makeFile('img', 'image/png'),
            makeFile('txt', 'text/plain'),
        ]
        await engine.processAll(files, makeContext())
        expect(processFn).toHaveBeenCalledTimes(1)
    })

    it('rejects if any file throws', async () => {
        const step: PipelineStep = {
            name: 'fail-on-b',
            process: async file => {
                if (file.id === 'b') throw new Error('boom')
                return file
            },
        }
        const engine = new PipelineEngine([step])
        await expect(
            engine.processAll([makeFile('a'), makeFile('b')], makeContext()),
        ).rejects.toThrow('boom')
    })
})
