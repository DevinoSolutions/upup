import { describe, it, expect, vi, beforeEach } from 'vitest'
import {
    fileAppendParams,
    revokeFileUrl,
    searchDriveFiles,
    fileGetIsImage,
    fileGetIsText,
    fileCanPreviewText,
    fileGetExtension,
    fileIs3D,
    PREVIEW_MAX_TEXT_SIZE,
} from '../src/lib/file'
import type { UploadFile } from '@upup/core'

let urlCounter = 0
beforeEach(() => {
    urlCounter = 0
    vi.stubGlobal('URL', {
        ...URL,
        createObjectURL: vi.fn(() => `blob:test-${++urlCounter}`),
        revokeObjectURL: vi.fn(),
    })
})

// ─────────────────────────────────────────────
// fileAppendParams
// ─────────────────────────────────────────────
describe('fileAppendParams', () => {
    it('returns an UploadFile', () => {
        const f = new File(['data'], 'test.txt', { type: 'text/plain' })
        const result = fileAppendParams(f)
        expect(result).toBeInstanceOf(File)
    })

    it('assigns a url via createObjectURL', () => {
        const f = new File(['data'], 'test.txt')
        const result = fileAppendParams(f)
        expect(result.url).toMatch(/^blob:test-/)
        expect(URL.createObjectURL).toHaveBeenCalledWith(f)
    })

    it('assigns an id derived from the file name', () => {
        const f = new File(['data'], 'photo.png', { type: 'image/png' })
        const result = fileAppendParams(f)
        expect(typeof result.id).toBe('string')
        expect(result.id.length).toBeGreaterThan(0)
    })

    it('does not overwrite an existing id', () => {
        const f = new File(['data'], 'photo.png') as unknown as UploadFile
        f.id = 'existing-id'
        const result = fileAppendParams(f)
        expect(result.id).toBe('existing-id')
    })

    it('does not overwrite an existing url', () => {
        const f = new File(['data'], 'photo.png') as unknown as UploadFile
        f.url = 'blob:already-set'
        const result = fileAppendParams(f)
        expect(result.url).toBe('blob:already-set')
    })

    it('uses webkitRelativePath for id when present', () => {
        const f = new File(['data'], 'photo.png') as unknown as UploadFile & {
            webkitRelativePath?: string
        }
        f.webkitRelativePath = 'folder/photo.png'
        const result = fileAppendParams(f)
        // id should be based on the relative path, not just the name
        const nameOnlyFile = new File(['data'], 'photo.png')
        const nameOnlyResult = fileAppendParams(nameOnlyFile)
        expect(result.id).not.toBe(nameOnlyResult.id)
    })
})

// ─────────────────────────────────────────────
// revokeFileUrl
// ─────────────────────────────────────────────
describe('revokeFileUrl', () => {
    it('calls revokeObjectURL for blob URLs', () => {
        const f = { url: 'blob:some-url' } as UploadFile
        revokeFileUrl(f)
        expect(URL.revokeObjectURL).toHaveBeenCalledWith('blob:some-url')
    })

    it('does not call revokeObjectURL for non-blob URLs', () => {
        const f = { url: 'https://example.com/file.png' } as UploadFile
        revokeFileUrl(f)
        expect(URL.revokeObjectURL).not.toHaveBeenCalled()
    })

    it('does not throw when url is undefined', () => {
        const f = {} as UploadFile
        expect(() => revokeFileUrl(f)).not.toThrow()
    })

    it('does not throw when url is empty string', () => {
        const f = { url: '' } as UploadFile
        expect(() => revokeFileUrl(f)).not.toThrow()
    })
})

// ─────────────────────────────────────────────
// searchDriveFiles
// ─────────────────────────────────────────────
describe('searchDriveFiles', () => {
    const files = [
        { name: 'Report.pdf' },
        { name: 'report-2024.pdf' },
        { name: 'Image.png' },
        { name: 'notes.txt' },
        { name: 'NOTES_FINAL.docx' },
    ]

    it('returns all files when searchTerm is empty', () => {
        expect(searchDriveFiles(files, '')).toHaveLength(5)
    })

    it('finds files by partial name (case-insensitive by default)', () => {
        const results = searchDriveFiles(files, 'report')
        expect(results).toHaveLength(2)
        expect(results.map(f => f.name)).toContain('Report.pdf')
        expect(results.map(f => f.name)).toContain('report-2024.pdf')
    })

    it('is case-insensitive by default', () => {
        expect(searchDriveFiles(files, 'REPORT')).toHaveLength(2)
        expect(searchDriveFiles(files, 'report')).toHaveLength(2)
    })

    it('is case-sensitive when caseSensitive=true', () => {
        const results = searchDriveFiles(files, 'report', {
            caseSensitive: true,
        })
        // Only lowercase 'report-2024.pdf' matches
        expect(results).toHaveLength(1)
        expect(results[0]!.name).toBe('report-2024.pdf')
    })

    it('returns exact match only when exactMatch=true', () => {
        const results = searchDriveFiles(files, 'notes.txt', {
            exactMatch: true,
        })
        expect(results).toHaveLength(1)
        expect(results[0]!.name).toBe('notes.txt')
    })

    it('respects maxResults limit', () => {
        const many = Array.from({ length: 20 }, (_, i) => ({
            name: `file-${i}.txt`,
        }))
        expect(searchDriveFiles(many, '', { maxResults: 5 })).toHaveLength(5)
    })

    it('returns empty array when no files match', () => {
        expect(searchDriveFiles(files, 'nonexistent-xyz')).toHaveLength(0)
    })
})

// ─────────────────────────────────────────────
// fileGetIsImage
// ─────────────────────────────────────────────
describe('fileGetIsImage', () => {
    it('returns true for image/png', () => {
        expect(fileGetIsImage('image/png')).toBe(true)
    })

    it('returns true for image/jpeg', () => {
        expect(fileGetIsImage('image/jpeg')).toBe(true)
    })

    it('returns true for image/webp', () => {
        expect(fileGetIsImage('image/webp')).toBe(true)
    })

    it('returns false for text/plain', () => {
        expect(fileGetIsImage('text/plain')).toBe(false)
    })

    it('returns false for application/pdf', () => {
        expect(fileGetIsImage('application/pdf')).toBe(false)
    })

    it('returns false for empty string', () => {
        expect(fileGetIsImage('')).toBe(false)
    })
})

// ─────────────────────────────────────────────
// fileGetIsText
// ─────────────────────────────────────────────
describe('fileGetIsText', () => {
    it('returns true for text/* MIME types', () => {
        expect(fileGetIsText('text/plain', 'notes.txt')).toBe(true)
        expect(fileGetIsText('text/html', 'index.html')).toBe(true)
        expect(fileGetIsText('text/css', 'style.css')).toBe(true)
    })

    it('returns true for .json files', () => {
        expect(fileGetIsText('application/json', 'data.json')).toBe(true)
    })

    it('returns true for .md files by extension when fileType is non-empty', () => {
        expect(fileGetIsText('application/octet-stream', 'README.md')).toBe(
            true,
        )
    })

    it('returns true for .ts/.js files by extension when fileType is non-empty', () => {
        expect(fileGetIsText('application/octet-stream', 'index.ts')).toBe(true)
        expect(fileGetIsText('application/octet-stream', 'app.js')).toBe(true)
    })

    it('returns false when fileType is empty regardless of extension', () => {
        expect(fileGetIsText('', 'README.md')).toBe(false)
    })

    it('returns false for image/png', () => {
        expect(fileGetIsText('image/png', 'photo.png')).toBe(false)
    })

    it('returns false when fileType is empty and no matching extension', () => {
        expect(fileGetIsText('', 'photo.png')).toBe(false)
    })
})

// ─────────────────────────────────────────────
// fileCanPreviewText
// ─────────────────────────────────────────────
describe('fileCanPreviewText', () => {
    it('returns true for small text files', () => {
        expect(fileCanPreviewText('text/plain', 'notes.txt', 1000)).toBe(true)
    })

    it('returns false for text files exceeding PREVIEW_MAX_TEXT_SIZE', () => {
        expect(
            fileCanPreviewText(
                'text/plain',
                'big.txt',
                PREVIEW_MAX_TEXT_SIZE + 1,
            ),
        ).toBe(false)
    })

    it('returns true when fileSize is undefined (unknown size)', () => {
        expect(fileCanPreviewText('text/plain', 'notes.txt', undefined)).toBe(
            true,
        )
    })

    it('returns false for non-text files', () => {
        expect(fileCanPreviewText('image/png', 'photo.png', 100)).toBe(false)
    })
})

// ─────────────────────────────────────────────
// fileGetExtension
// ─────────────────────────────────────────────
describe('fileGetExtension', () => {
    it('extracts extension from MIME type', () => {
        expect(fileGetExtension('image/png', 'photo.png')).toBe('png')
        expect(fileGetExtension('image/jpeg', 'photo.jpg')).toBe('jpeg')
    })

    it('falls back to file name extension when type is empty', () => {
        expect(fileGetExtension('', 'document.pdf')).toBe('pdf')
    })

    it('is case-insensitive (lowercases result)', () => {
        expect(fileGetExtension('image/PNG', 'photo.PNG')).toBe('png')
    })

    it('returns the filename itself when no dot and no type', () => {
        // split('.').pop() on a string with no dot returns the whole string
        expect(fileGetExtension('', 'noextension')).toBe('noextension')
    })
})

// ─────────────────────────────────────────────
// fileIs3D
// ─────────────────────────────────────────────
describe('fileIs3D', () => {
    it('returns true for common 3D extensions', () => {
        expect(fileIs3D('stl')).toBe(true)
        expect(fileIs3D('obj')).toBe(true)
        expect(fileIs3D('gltf')).toBe(true)
        expect(fileIs3D('glb')).toBe(true)
        expect(fileIs3D('fbx')).toBe(true)
    })

    it('is case-insensitive', () => {
        expect(fileIs3D('STL')).toBe(true)
        expect(fileIs3D('OBJ')).toBe(true)
    })

    it('returns false for non-3D extensions', () => {
        expect(fileIs3D('png')).toBe(false)
        expect(fileIs3D('pdf')).toBe(false)
        expect(fileIs3D('mp4')).toBe(false)
    })

    it('returns false for empty string', () => {
        expect(fileIs3D('')).toBe(false)
    })
})
