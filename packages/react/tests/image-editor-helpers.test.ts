import { describe, it, expect, vi, beforeEach } from 'vitest'
import {
    dataURLtoBlob,
    blobToUploadFile,
    revokeAndReplace,
} from '../src/lib/imageEditorHelpers'
import { FileSource, UploadStatus, type UploadFile } from '@upup/core'

// jsdom does not implement createObjectURL / revokeObjectURL
const objectURLs = new Map<string, Blob>()
let urlCounter = 0

beforeEach(() => {
    objectURLs.clear()
    urlCounter = 0
    vi.stubGlobal('URL', {
        ...URL,
        createObjectURL: vi.fn((blob: Blob) => {
            const key = `blob:test-${++urlCounter}`
            objectURLs.set(key, blob)
            return key
        }),
        revokeObjectURL: vi.fn((url: string) => {
            objectURLs.delete(url)
        }),
    })
})

// ─────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────
function makeDataURL(mime: string, text: string): string {
    const base64 = btoa(text)
    return `data:${mime};base64,${base64}`
}

function makeUploadFile(overrides: Partial<UploadFile> = {}): UploadFile {
    const base = new File(['content'], 'photo.png', { type: 'image/png' }) as UploadFile
    base.id = overrides.id ?? 'file-1'
    base.url = overrides.url ?? 'blob:original-url'
    base.source = overrides.source ?? FileSource.LOCAL
    base.status = overrides.status ?? UploadStatus.READY
    base.metadata = overrides.metadata ?? {}
    base.key = overrides.key ?? 'uploads/photo.png'
    base.fileHash = overrides.fileHash ?? 'abc123'
    base.thumbnail = overrides.thumbnail ?? ({ file: base } as UploadFile['thumbnail'])
    return base
}

// ─────────────────────────────────────────────
// dataURLtoBlob
// ─────────────────────────────────────────────
describe('dataURLtoBlob', () => {
    it('returns a Blob with the correct MIME type', () => {
        const dataURL = makeDataURL('image/png', 'fake-png-bytes')
        const blob = dataURLtoBlob(dataURL)
        expect(blob.type).toBe('image/png')
    })

    it('returns a Blob with the correct byte length', () => {
        const content = 'hello'
        const dataURL = makeDataURL('text/plain', content)
        const blob = dataURLtoBlob(dataURL)
        expect(blob.size).toBe(content.length)
    })

    it('handles image/jpeg MIME type', () => {
        const dataURL = makeDataURL('image/jpeg', 'jpeg-bytes')
        const blob = dataURLtoBlob(dataURL)
        expect(blob.type).toBe('image/jpeg')
    })

    it('handles application/pdf MIME type', () => {
        const dataURL = makeDataURL('application/pdf', 'pdf-content')
        const blob = dataURLtoBlob(dataURL)
        expect(blob.type).toBe('application/pdf')
    })

    it('falls back to application/octet-stream when MIME is missing', () => {
        // Malformed header with no MIME match
        const dataURL = `data:base64,${btoa('raw-bytes')}`
        const blob = dataURLtoBlob(dataURL)
        expect(blob.type).toBe('application/octet-stream')
    })

    it('returns a Blob instance', () => {
        const dataURL = makeDataURL('image/png', 'bytes')
        const blob = dataURLtoBlob(dataURL)
        expect(blob).toBeInstanceOf(Blob)
    })
})

// ─────────────────────────────────────────────
// blobToUploadFile
// ─────────────────────────────────────────────
describe('blobToUploadFile', () => {
    it('preserves original id', () => {
        const original = makeUploadFile({ id: 'unique-id-42' })
        const blob = new Blob(['data'], { type: 'image/png' })
        const result = blobToUploadFile(blob, original)
        expect(result.id).toBe('unique-id-42')
    })

    it('preserves original key', () => {
        const original = makeUploadFile({ key: 'uploads/my-image.png' })
        const blob = new Blob(['data'], { type: 'image/png' })
        const result = blobToUploadFile(blob, original)
        expect(result.key).toBe('uploads/my-image.png')
    })

    it('preserves original fileHash', () => {
        const original = makeUploadFile({ fileHash: 'deadbeef' })
        const blob = new Blob(['data'], { type: 'image/png' })
        const result = blobToUploadFile(blob, original)
        expect(result.fileHash).toBe('deadbeef')
    })

    it('preserves original thumbnail', () => {
        const original = makeUploadFile({ thumbnail: 'blob:thumb-123' })
        const blob = new Blob(['data'], { type: 'image/png' })
        const result = blobToUploadFile(blob, original)
        expect(result.thumbnail).toBe('blob:thumb-123')
    })

    it('uses original filename by default', () => {
        const original = makeUploadFile()
        const blob = new Blob(['data'], { type: 'image/png' })
        const result = blobToUploadFile(blob, original)
        expect(result.name).toBe('photo.png')
    })

    it('uses output.fileName when provided', () => {
        const original = makeUploadFile()
        const blob = new Blob(['data'], { type: 'image/png' })
        const result = blobToUploadFile(blob, original, {
            fileName: () => 'edited-photo.png',
        })
        expect(result.name).toBe('edited-photo.png')
    })

    it('creates a new blob URL', () => {
        const original = makeUploadFile({ url: 'blob:original' })
        const blob = new Blob(['data'], { type: 'image/png' })
        const result = blobToUploadFile(blob, original)
        expect(result.url).toBeTruthy()
        expect(result.url).not.toBe('blob:original')
    })

    it('uses blob.type when provided', () => {
        const original = makeUploadFile()
        const blob = new Blob(['data'], { type: 'image/webp' })
        const result = blobToUploadFile(blob, original)
        expect(result.type).toBe('image/webp')
    })

    it('falls back to original.type when blob has no type', () => {
        const original = new File(['content'], 'photo.png', { type: 'image/png' }) as UploadFile
        original.id = 'f1'
        original.url = 'blob:x'
        original.key = 'k'
        original.fileHash = 'h'
        original.thumbnail = 't'
        const blob = new Blob(['data']) // no type
        const result = blobToUploadFile(blob, original)
        expect(result.type).toBe('image/png')
    })

    it('returns a File instance', () => {
        const original = makeUploadFile()
        const blob = new Blob(['data'], { type: 'image/png' })
        const result = blobToUploadFile(blob, original)
        expect(result).toBeInstanceOf(File)
    })
})

// ─────────────────────────────────────────────
// revokeAndReplace
// ─────────────────────────────────────────────
describe('revokeAndReplace', () => {
    it('returns a new Map instance (does not mutate)', () => {
        const original = makeUploadFile({ id: 'f1', url: 'blob:old' })
        const newFile = makeUploadFile({ id: 'f1', url: 'blob:new' })
        const map = new Map([['f1', original]])
        const result = revokeAndReplace(map, 'f1', newFile)
        expect(result).not.toBe(map)
    })

    it('replaces the file at the given id', () => {
        const original = makeUploadFile({ id: 'f1', url: 'blob:old' })
        const newFile = makeUploadFile({ id: 'f1', url: 'blob:new' })
        const map = new Map([['f1', original]])
        const result = revokeAndReplace(map, 'f1', newFile)
        expect(result.get('f1')).toBe(newFile)
    })

    it('calls revokeObjectURL for the old blob URL', () => {
        const original = makeUploadFile({ id: 'f1', url: 'blob:old-url' })
        const newFile = makeUploadFile({ id: 'f1', url: 'blob:new-url' })
        const map = new Map([['f1', original]])
        revokeAndReplace(map, 'f1', newFile)
        expect(URL.revokeObjectURL).toHaveBeenCalledWith('blob:old-url')
    })

    it('does not revoke when fileId is not in the map', () => {
        const newFile = makeUploadFile({ id: 'f99', url: 'blob:new' })
        const map = new Map<string, UploadFile>()
        revokeAndReplace(map, 'f99', newFile)
        expect(URL.revokeObjectURL).not.toHaveBeenCalled()
    })

    it('still sets the new file even when old file was absent', () => {
        const newFile = makeUploadFile({ id: 'f99', url: 'blob:new' })
        const map = new Map<string, UploadFile>()
        const result = revokeAndReplace(map, 'f99', newFile)
        expect(result.get('f99')).toBe(newFile)
    })

    it('preserves other entries in the map', () => {
        const f1 = makeUploadFile({ id: 'f1', url: 'blob:f1' })
        const f2 = makeUploadFile({ id: 'f2', url: 'blob:f2' })
        const newF1 = makeUploadFile({ id: 'f1', url: 'blob:f1-new' })
        const map = new Map([['f1', f1], ['f2', f2]])
        const result = revokeAndReplace(map, 'f1', newF1)
        expect(result.get('f2')).toBe(f2)
        expect(result.size).toBe(2)
    })

    it('does not mutate the original map', () => {
        const original = makeUploadFile({ id: 'f1', url: 'blob:old' })
        const newFile = makeUploadFile({ id: 'f1', url: 'blob:new' })
        const map = new Map([['f1', original]])
        revokeAndReplace(map, 'f1', newFile)
        expect(map.get('f1')).toBe(original)
    })
})
