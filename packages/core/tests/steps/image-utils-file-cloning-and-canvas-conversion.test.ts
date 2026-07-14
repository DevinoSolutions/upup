// Direct unit coverage for image-utils.ts's File-cloning and canvas-conversion
// primitives. cloneUploadFile is the mechanism CLAUDE.md flags as historically
// fragile: `{...file}` silently strips File's internal blob slots, so the
// production code must mutate a real File via Object.assign instead of
// spreading. These tests pin that it still does, plus the canvasToBlob /
// blobToDataUrl conversions that sit alongside it in the same module.

import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import {
    cloneUploadFile,
    canvasToBlob,
    blobToDataUrl,
    createCanvas,
} from '../../src/steps/image-utils'
import type { UploadFile } from '../../src/contracts'
import {
    installCanvasShim,
    removeCanvasShim,
} from '../helpers/node-canvas-shim'

// Builds an UploadFile exercising every field cloneUploadFile enumerates
// (packages/core/src/steps/image-utils.ts, cloneUploadFile): id, source,
// status, metadata, url, relativePath, key, etag, and the deprecated
// fileHash/checksumSHA256/thumbnail trio still propagated for back-compat.
function makeOriginal(): UploadFile {
    const file = new File([new Uint8Array([1, 2, 3])], 'original.png', {
        type: 'image/png',
        lastModified: 1_600_000_000_000,
    })
    return Object.assign(file, {
        id: 'file-id-1',
        source: 'local',
        status: 'idle',
        metadata: { originalContentHash: 'hash-1', width: 100 },
        url: 'blob:original',
        relativePath: 'folder/original.png',
        key: 's3-key-1',
        etag: 'etag-1',
        fileHash: 'legacy-hash-1',
        checksumSHA256: 'legacy-checksum-1',
        thumbnail: { file: new File([], 'thumb.png'), key: 'thumb-key-1' },
    }) as unknown as UploadFile
}

describe('cloneUploadFile', () => {
    it('returns a real File carrying the replacement bytes/name/type/lastModified', () => {
        const original = makeOriginal()
        const replacement = new File(
            [new Uint8Array([10, 20, 30, 40, 50])],
            'replacement.jpg',
            { type: 'image/jpeg', lastModified: 1_650_000_000_000 },
        )

        const result = cloneUploadFile(original, replacement)

        expect(result).toBeInstanceOf(File)
        expect(result.name).toBe('replacement.jpg')
        expect(result.type).toBe('image/jpeg')
        expect(result.lastModified).toBe(1_650_000_000_000)
    })

    it('carries over every upup identity field, merging metadata with override precedence', () => {
        const original = makeOriginal()
        const replacement = new File([new Uint8Array([1])], 'r.jpg', {
            type: 'image/jpeg',
        })

        const result = cloneUploadFile(original, replacement, {
            width: 50, // overrides original.metadata.width (100)
            compressed: true,
        })

        expect(result.id).toBe('file-id-1')
        expect(result.source).toBe('local')
        expect(result.status).toBe('idle')
        expect(result.url).toBe('blob:original')
        expect(result.relativePath).toBe('folder/original.png')
        expect(result.key).toBe('s3-key-1')
        expect(result.etag).toBe('etag-1')
        expect(result.fileHash).toBe('legacy-hash-1')
        expect(result.checksumSHA256).toBe('legacy-checksum-1')
        expect(result.thumbnail).toBe(original.thumbnail)
        // Merge order is {...original.metadata, ...override}: original keys
        // survive, override wins on conflict (width), new keys are added.
        expect(result.metadata).toEqual({
            originalContentHash: 'hash-1',
            width: 50,
            compressed: true,
        })
    })

    it('round-trips the replacement bytes unchanged (arrayBuffer)', async () => {
        const original = makeOriginal()
        const bytes = new Uint8Array([10, 20, 30, 40, 50])
        const replacement = new File([bytes], 'r.jpg', { type: 'image/jpeg' })

        const result = cloneUploadFile(original, replacement)

        expect(new Uint8Array(await result.arrayBuffer())).toEqual(bytes)
    })

    it('keeps blob slots intact — slice() still works on the clone (the {...file} regression)', async () => {
        const original = makeOriginal()
        const bytes = new Uint8Array([10, 20, 30, 40, 50])
        const replacement = new File([bytes], 'r.jpg', { type: 'image/jpeg' })

        const result = cloneUploadFile(original, replacement)
        const sliced = result.slice(1, 3)

        expect(sliced).toBeInstanceOf(Blob)
        expect(new Uint8Array(await sliced.arrayBuffer())).toEqual(
            new Uint8Array([20, 30]),
        )
    })
})

describe('canvasToBlob', () => {
    beforeAll(() => {
        installCanvasShim()
    })
    afterAll(() => {
        removeCanvasShim()
    })

    it('resolves a Blob of the requested MIME type (convertToBlob happy path)', async () => {
        const canvas = createCanvas(8, 8)
        expect(canvas).not.toBeNull()

        const blob = await canvasToBlob(canvas!, 'image/png', 0.9)

        expect(blob).toBeInstanceOf(Blob)
        expect(blob!.type).toBe('image/png')
        expect(blob!.size).toBeGreaterThan(0)
    })

    it('resolves null (does not throw or reject) when the callback-based toBlob path yields null', async () => {
        // A canvas-like object with no convertToBlob (the OffscreenCanvas
        // fast path) forces canvasToBlob down the legacy toBlob() callback
        // branch; that callback can legitimately be invoked with null.
        const fakeCanvas = {
            toBlob(callback: (blob: Blob | null) => void) {
                callback(null)
            },
        } as unknown as HTMLCanvasElement

        await expect(
            canvasToBlob(fakeCanvas, 'image/png', 0.9),
        ).resolves.toBeNull()
    })
})

describe('blobToDataUrl', () => {
    // Orphan-audit verdict: NOT orphaned. It has a real production call site
    // inside its own module — image-utils.ts's createThumbnail() calls it
    // (packages/core/src/steps/image-utils.ts:275) — and createThumbnail is
    // itself invoked from steps/thumbnail.ts (the thumbnail pipeline step)
    // and worker/handle-task.ts (the web-worker task handler). It is not part
    // of the public `index.ts` or `internal.ts` barrel (grepping both finds
    // no match), so it is unreachable by direct import from outside core —
    // but within core it is genuinely exercised production code, not dead
    // code. Tested directly below.
    it('round-trips a blob through a base64 data URL', async () => {
        const bytes = new Uint8Array([72, 101, 108, 108, 111]) // "Hello"
        const blob = new Blob([bytes], { type: 'text/plain' })

        const dataUrl = await blobToDataUrl(blob)

        const prefix = 'data:text/plain;base64,'
        expect(dataUrl.startsWith(prefix)).toBe(true)
        const decoded = Buffer.from(dataUrl.slice(prefix.length), 'base64')
        expect(new Uint8Array(decoded)).toEqual(bytes)
    })
})
