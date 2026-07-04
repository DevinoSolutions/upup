import { describe, it, expect } from 'vitest'
import { ICONS } from '../../icons/registry'
import { fileTypeIconName } from '../../icons/file-type-icon'
import { FILE_TYPE_EXTENSIONS } from '../../icons/file-type-icons'

describe('fileTypeIconName', () => {
    it('maps a known extension to its file-<ext> glyph', () => {
        expect(fileTypeIconName('pdf')).toBe('file-pdf')
        expect(fileTypeIconName('zip')).toBe('file-zip')
    })
    it('is case-insensitive', () => {
        expect(fileTypeIconName('PDF')).toBe('file-pdf')
    })
    it('falls back to the generic file glyph for unknown/empty', () => {
        expect(fileTypeIconName('unknown')).toBe('file')
        expect(fileTypeIconName('')).toBe('file')
    })
    it('every supported extension has a registry glyph (parity with old React fileTypes)', () => {
        for (const ext of FILE_TYPE_EXTENSIONS) {
            expect(ICONS, `missing file-${ext}`).toHaveProperty(`file-${ext}`)
        }
    })
    it('covers exactly the extensions React previously typed', () => {
        expect([...FILE_TYPE_EXTENSIONS].sort()).toEqual(
            [
                'bmp',
                'css',
                'csv',
                'docx',
                'html',
                'jpg',
                'js',
                'jsx',
                'pdf',
                'php',
                'png',
                'ppt',
                'rs',
                'sql',
                'svg',
                'ts',
                'tsx',
                'txt',
                'vue',
                'xls',
                'xml',
                'zip',
            ].sort(),
        )
    })
})
