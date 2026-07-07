import { describe, it, expect } from 'vitest'
import { uploadFileFromImageResult } from '../../src/steps/image-utils'
import type { UploadFile } from '../../src/contracts'

const makeFile = (name = 'orig.png', type = 'image/png'): UploadFile => {
    const f = new File([new Uint8Array([1, 2, 3])], name, { type })
    return Object.assign(f, {
        id: 'id-1',
        source: 'local',
        status: 'idle',
        metadata: { keep: 'me' },
        url: 'blob:x',
        relativePath: null,
        key: null,
        etag: null,
        fileHash: null,
        checksumSHA256: 'sum-1',
        thumbnail: null,
    }) as unknown as UploadFile
}

describe('uploadFileFromImageResult', () => {
    it('rebuilds an UploadFile from result bytes, preserving identity fields and merging metadata', () => {
        const original = makeFile()
        const bytes = new Uint8Array([9, 9, 9, 9]).buffer
        const out = uploadFileFromImageResult(original, {
            bytes,
            type: 'image/jpeg',
            name: 'orig.jpg',
            metadata: { compressed: true },
        })

        expect(out.name).toBe('orig.jpg')
        expect(out.type).toBe('image/jpeg')
        expect(out.size).toBe(4)
        expect(out.id).toBe('id-1')
        expect(out.checksumSHA256).toBe('sum-1')
        expect(out.metadata).toMatchObject({ keep: 'me', compressed: true })
    })

    it('falls back to original name/type when result omits them', () => {
        const original = makeFile('p.png', 'image/png')
        const out = uploadFileFromImageResult(original, {
            bytes: new ArrayBuffer(2),
            type: '',
        })
        expect(out.name).toBe('p.png')
        expect(out.type).toBe('image/png')
    })
})
