import checkFileType from './checkFileType'

describe('checkFileType', () => {
    it('accepts any file when accept is *', () => {
        expect(checkFileType('*', 'image/jpeg')).toBe(true)
        expect(checkFileType('*', 'application/pdf')).toBe(true)
    })

    it('handles mime type wildcards', () => {
        expect(checkFileType('image/*', 'image/jpeg')).toBe(true)
        expect(checkFileType('image/*', 'image/png')).toBe(true)
        expect(checkFileType('image/*', 'application/pdf')).toBe(false)
    })

    it('handles specific mime types', () => {
        expect(checkFileType('image/jpeg', 'image/jpeg')).toBe(true)
        expect(checkFileType('image/jpeg', 'image/png')).toBe(false)
    })

    it('handles multiple accept values', () => {
        expect(checkFileType('image/jpeg,image/png', 'image/jpeg')).toBe(true)
        expect(checkFileType('image/jpeg,image/png', 'image/png')).toBe(true)
        expect(checkFileType('image/jpeg,image/png', 'image/gif')).toBe(false)
    })

    it('handles empty or invalid inputs', () => {
        expect(checkFileType('', 'image/jpeg')).toBe(false) // Empty accept string
        expect(checkFileType('*', '')).toBe(false) // Empty file type
    })

    it('handles whitespace in accept string', () => {
        expect(checkFileType(' image/jpeg , image/png ', 'image/jpeg')).toBe(
            true,
        )
        expect(checkFileType('image/jpeg,  image/png', 'image/png')).toBe(true)
    })

    it('handles case sensitivity', () => {
        expect(checkFileType('IMAGE/JPEG', 'image/jpeg')).toBe(true)
        expect(checkFileType('image/jpeg', 'IMAGE/JPEG')).toBe(true)
    })

    it('handles partial mime types correctly', () => {
        expect(checkFileType('image/*', 'image/')).toBe(false) // Invalid file type
        expect(checkFileType('image/*', 'image')).toBe(false) // Invalid file type
    })
})
