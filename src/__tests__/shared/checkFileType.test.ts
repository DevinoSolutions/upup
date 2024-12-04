import checkFileType from '../../shared/lib/checkFileType'

const JPEGImage = {
    type: 'image/jpeg',
} as File
const PNGImage = {
    type: 'image/png',
} as File
const GIFImage = {
    type: 'image/gif',
} as File
const PDFFile = {
    type: 'application/pdf',
} as File

describe('checkFileType', () => {
    it('accepts any file when accept is *', () => {
        expect(checkFileType('*', JPEGImage)).toBe(true)
        expect(checkFileType('*', PDFFile)).toBe(true)
    })

    it('handles mime type wildcards', () => {
        expect(checkFileType('image/*', JPEGImage)).toBe(true)
        expect(checkFileType('image/*', PNGImage)).toBe(true)
        expect(checkFileType('image/*', PDFFile)).toBe(false)
    })

    it('handles specific mime types', () => {
        expect(checkFileType('image/jpeg', JPEGImage)).toBe(true)
        expect(checkFileType('image/jpeg', PNGImage)).toBe(false)
    })

    it('handles multiple accept values', () => {
        expect(checkFileType('image/jpeg,image/png', JPEGImage)).toBe(true)
        expect(checkFileType('image/jpeg,image/png', PNGImage)).toBe(true)
        expect(checkFileType('image/jpeg,image/png', GIFImage)).toBe(false)
    })

    it('handles empty or invalid inputs', () => {
        expect(checkFileType('', JPEGImage)).toBe(false) // Empty accept string
        expect(checkFileType('*', {} as File)).toBe(false) // Empty file type
    })

    it('handles whitespace in accept string', () => {
        expect(checkFileType(' image/jpeg , image/png ', JPEGImage)).toBe(true)
        expect(checkFileType('image/jpeg,  image/png', PNGImage)).toBe(true)
    })

    it('handles case sensitivity', () => {
        expect(checkFileType('IMAGE/JPEG', JPEGImage)).toBe(true)
        expect(
            checkFileType('image/jpeg', { type: 'IMAGE/JPEG' } as File),
        ).toBe(true)
    })

    it('handles partial mime types correctly', () => {
        expect(checkFileType('image/*', { type: 'image/' } as File)).toBe(false) // Invalid file type
        expect(checkFileType('image/*', { type: 'image' } as File)).toBe(false) // Invalid file type
    })
})
