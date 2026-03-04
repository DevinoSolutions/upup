import {
    blobToFileWithParams,
    dataURLtoBlob,
    revokeAndReplace,
} from '../../frontend/lib/imageEditorHelpers'
import { FileWithParams } from '../../shared/types'

// ---------------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------------

const revokeObjectURL = jest.fn()
const createObjectURL = jest.fn(() => 'blob:http://localhost/new-url')

beforeAll(() => {
    global.URL.createObjectURL = createObjectURL
    global.URL.revokeObjectURL = revokeObjectURL
})

afterEach(() => {
    jest.clearAllMocks()
})

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Create a minimal FileWithParams for testing. */
function makeFileWithParams(
    overrides: Partial<FileWithParams> = {},
): FileWithParams {
    const file = new File(['hello'], 'photo.png', {
        type: 'image/png',
    }) as FileWithParams
    file.id = 'dGVzdC1pZA=='
    file.url = 'blob:http://localhost/old-url'
    file.key = 'uploads/photo.png'
    file.fileHash = 'abc123'
    file.thumbnail = undefined
    return Object.assign(file, overrides)
}

/** Encode a tiny 1×1 red PNG pixel as a base-64 data URL for testing. */
function makePngDataURL(): string {
    // Smallest valid PNG: 1×1 red pixel (67 bytes)
    const base64 =
        'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8/5+hHgAHggJ/PchI7wAAAABJRU5ErkJggg=='
    return `data:image/png;base64,${base64}`
}

// ---------------------------------------------------------------------------
// dataURLtoBlob
// ---------------------------------------------------------------------------

describe('dataURLtoBlob', () => {
    it('converts a PNG data URL into a Blob with the correct MIME type', () => {
        const blob = dataURLtoBlob(makePngDataURL())

        expect(blob).toBeInstanceOf(Blob)
        expect(blob.type).toBe('image/png')
        expect(blob.size).toBeGreaterThan(0)
    })

    it('handles a JPEG data URL', () => {
        // Tiny valid JPEG-ish payload (content validity isn't important here)
        const jpeg = `data:image/jpeg;base64,${btoa('fake-jpeg-bytes')}`
        const blob = dataURLtoBlob(jpeg)

        expect(blob.type).toBe('image/jpeg')
    })

    it('falls back to application/octet-stream when MIME is unrecognisable', () => {
        // Header without a colon-semicolon group → regex returns null
        const weird = `nope,${btoa('stuff')}`
        const blob = dataURLtoBlob(weird)

        expect(blob.type).toBe('application/octet-stream')
    })
})

// ---------------------------------------------------------------------------
// blobToFileWithParams
// ---------------------------------------------------------------------------

describe('blobToFileWithParams', () => {
    it('returns a FileWithParams preserving the original id', () => {
        const original = makeFileWithParams()
        const blob = new Blob(['edited'], { type: 'image/png' })
        const result = blobToFileWithParams(blob, original)

        expect(result.id).toBe(original.id)
    })

    it('creates a new blob URL via URL.createObjectURL', () => {
        const original = makeFileWithParams()
        const blob = new Blob(['edited'], { type: 'image/png' })
        const result = blobToFileWithParams(blob, original)

        expect(createObjectURL).toHaveBeenCalledTimes(1)
        expect(result.url).toBe('blob:http://localhost/new-url')
    })

    it('keeps the original file name when output.fileName is not provided', () => {
        const original = makeFileWithParams()
        const blob = new Blob(['edited'], { type: 'image/png' })
        const result = blobToFileWithParams(blob, original)

        expect(result.name).toBe('photo.png')
    })

    it('uses output.fileName callback when provided', () => {
        const original = makeFileWithParams()
        const blob = new Blob(['edited'], { type: 'image/png' })
        const result = blobToFileWithParams(blob, original, {
            fileName: f => `edited-${f.name}`,
        })

        expect(result.name).toBe('edited-photo.png')
    })

    it('preserves key, fileHash, and thumbnail from original', () => {
        const thumbFile = new File(['thumb'], 'thumb.jpg', {
            type: 'image/jpeg',
        })
        const original = makeFileWithParams({
            key: 'my-key',
            fileHash: 'hash-123',
            thumbnail: { file: thumbFile, key: 'thumb-key' },
        })
        const blob = new Blob(['edited'], { type: 'image/png' })
        const result = blobToFileWithParams(blob, original)

        expect(result.key).toBe('my-key')
        expect(result.fileHash).toBe('hash-123')
        expect(result.thumbnail).toEqual({ file: thumbFile, key: 'thumb-key' })
    })

    it('uses the blob MIME type for the new file', () => {
        const original = makeFileWithParams()
        const blob = new Blob(['edited'], { type: 'image/webp' })
        const result = blobToFileWithParams(blob, original)

        expect(result.type).toBe('image/webp')
    })

    it('falls back to original MIME type when blob has no type', () => {
        const original = makeFileWithParams()
        const blob = new Blob(['edited']) // type defaults to ''
        const result = blobToFileWithParams(blob, original)

        expect(result.type).toBe('image/png')
    })
})

// ---------------------------------------------------------------------------
// revokeAndReplace
// ---------------------------------------------------------------------------

describe('revokeAndReplace', () => {
    it('returns a new Map (does not mutate the original)', () => {
        const original = makeFileWithParams()
        const replacement = makeFileWithParams({
            url: 'blob:http://localhost/new',
        })
        const map = new Map([['dGVzdC1pZA==', original]])

        const next = revokeAndReplace(map, 'dGVzdC1pZA==', replacement)

        expect(next).not.toBe(map)
        expect(map.get('dGVzdC1pZA==')).toBe(original) // original unchanged
    })

    it('replaces the file at the given id', () => {
        const original = makeFileWithParams()
        const replacement = makeFileWithParams({
            url: 'blob:http://localhost/new',
        })
        const map = new Map([['dGVzdC1pZA==', original]])

        const next = revokeAndReplace(map, 'dGVzdC1pZA==', replacement)

        expect(next.get('dGVzdC1pZA==')).toBe(replacement)
    })

    it('revokes the old blob URL of the replaced file', () => {
        const original = makeFileWithParams()
        const replacement = makeFileWithParams({
            url: 'blob:http://localhost/new',
        })
        const map = new Map([['dGVzdC1pZA==', original]])

        revokeAndReplace(map, 'dGVzdC1pZA==', replacement)

        expect(revokeObjectURL).toHaveBeenCalledWith(
            'blob:http://localhost/old-url',
        )
    })

    it('does not call revokeObjectURL when the file id is not in the map', () => {
        const replacement = makeFileWithParams({
            url: 'blob:http://localhost/new',
        })
        const map = new Map<string, FileWithParams>()

        const next = revokeAndReplace(map, 'missing-id', replacement)

        expect(revokeObjectURL).not.toHaveBeenCalled()
        expect(next.get('missing-id')).toBe(replacement)
    })

    it('preserves other entries in the map', () => {
        const fileA = makeFileWithParams({ id: 'a' })
        const fileB = makeFileWithParams({
            id: 'b',
            url: 'blob:http://localhost/b',
        })
        const replacement = makeFileWithParams({
            id: 'a',
            url: 'blob:http://localhost/a-new',
        })
        const map = new Map([
            ['a', fileA],
            ['b', fileB],
        ])

        const next = revokeAndReplace(map, 'a', replacement)

        expect(next.get('a')).toBe(replacement)
        expect(next.get('b')).toBe(fileB) // untouched
        expect(next.size).toBe(2)
    })
})
