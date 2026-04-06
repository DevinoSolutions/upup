import { describe, it, expect } from 'vitest'
import { FileManager, fileSizeInBytes, matchesAccept } from '../src/file-manager'

function makeFile(name = 'test.txt', size = 100, type = 'text/plain'): File {
    return Object.assign(new File([new Uint8Array(size)], name, { type }), {})
}

// ─────────────────────────────────────────────
// fileSizeInBytes
// ─────────────────────────────────────────────
describe('fileSizeInBytes', () => {
    it('returns bytes as-is for B unit', () => {
        expect(fileSizeInBytes({ size: 512, unit: 'B' })).toBe(512)
    })

    it('converts KB to bytes', () => {
        expect(fileSizeInBytes({ size: 1, unit: 'KB' })).toBe(1024)
    })

    it('converts MB to bytes', () => {
        expect(fileSizeInBytes({ size: 1, unit: 'MB' })).toBe(1024 ** 2)
    })

    it('converts GB to bytes', () => {
        expect(fileSizeInBytes({ size: 1, unit: 'GB' })).toBe(1024 ** 3)
    })

    it('scales with size multiplier', () => {
        expect(fileSizeInBytes({ size: 5, unit: 'MB' })).toBe(5 * 1024 ** 2)
    })

    it('falls back to 1 for unknown unit', () => {
        expect(fileSizeInBytes({ size: 10, unit: 'XB' as any })).toBe(10)
    })
})

// ─────────────────────────────────────────────
// matchesAccept
// ─────────────────────────────────────────────
describe('matchesAccept', () => {
    it('accepts exact MIME type match', () => {
        const f = makeFile('img.png', 100, 'image/png')
        expect(matchesAccept(f, 'image/png')).toBe(true)
    })

    it('rejects non-matching MIME type', () => {
        const f = makeFile('doc.pdf', 100, 'application/pdf')
        expect(matchesAccept(f, 'image/png')).toBe(false)
    })

    it('accepts wildcard MIME type (image/*)', () => {
        const f = makeFile('photo.jpg', 100, 'image/jpeg')
        expect(matchesAccept(f, 'image/*')).toBe(true)
    })

    it('rejects non-matching wildcard MIME type', () => {
        const f = makeFile('audio.mp3', 100, 'audio/mpeg')
        expect(matchesAccept(f, 'image/*')).toBe(false)
    })

    it('accepts by file extension (dotted)', () => {
        const f = makeFile('document.pdf', 100, 'application/pdf')
        expect(matchesAccept(f, '.pdf')).toBe(true)
    })

    it('extension matching is case-insensitive', () => {
        const f = makeFile('PHOTO.PNG', 100, 'image/png')
        expect(matchesAccept(f, '.png')).toBe(true)
    })

    it('accepts from comma-separated list', () => {
        const f = makeFile('img.gif', 100, 'image/gif')
        expect(matchesAccept(f, 'image/png, image/gif, .jpg')).toBe(true)
    })

    it('rejects when no token matches in comma-separated list', () => {
        const f = makeFile('doc.docx', 100, 'application/vnd.openxmlformats-officedocument.wordprocessingml.document')
        expect(matchesAccept(f, 'image/png, .pdf')).toBe(false)
    })
})

// ─────────────────────────────────────────────
// minFileSize constraint
// ─────────────────────────────────────────────
describe('FileManager — minFileSize', () => {
    it('throws FILE_TOO_SMALL when file is below minimum', async () => {
        const fm = new FileManager({ minFileSize: { size: 1, unit: 'KB' } })
        const f = makeFile('tiny.txt', 10) // 10 bytes < 1 KB
        await expect(fm.addFiles([f])).rejects.toThrow('minimum size')
    })

    it('accepts file that meets minimum size exactly', async () => {
        const fm = new FileManager({ minFileSize: { size: 10, unit: 'B' } })
        const f = makeFile('ok.txt', 10)
        const result = await fm.addFiles([f])
        expect(result).toHaveLength(1)
    })

    it('accepts file above minimum size', async () => {
        const fm = new FileManager({ minFileSize: { size: 1, unit: 'B' } })
        const f = makeFile('large.txt', 500)
        const result = await fm.addFiles([f])
        expect(result).toHaveLength(1)
    })
})

// ─────────────────────────────────────────────
// maxTotalFileSize constraint
// ─────────────────────────────────────────────
describe('FileManager — maxTotalFileSize', () => {
    it('throws TOTAL_SIZE_EXCEEDED when total exceeds limit', async () => {
        const fm = new FileManager({ maxTotalFileSize: { size: 100, unit: 'B' } })
        const f1 = makeFile('a.txt', 60)
        const f2 = makeFile('b.txt', 60) // 120 > 100
        await fm.addFiles([f1])
        await expect(fm.addFiles([f2])).rejects.toThrow('Total file size')
    })

    it('accepts batch within total limit', async () => {
        const fm = new FileManager({ maxTotalFileSize: { size: 200, unit: 'B' } })
        const f1 = makeFile('a.txt', 80)
        const f2 = makeFile('b.txt', 80)
        await fm.addFiles([f1])
        const result = await fm.addFiles([f2])
        expect(result).toHaveLength(1)
    })
})

// ─────────────────────────────────────────────
// removeFile return value
// ─────────────────────────────────────────────
describe('FileManager — removeFile return value', () => {
    it('returns the removed file', async () => {
        const fm = new FileManager({})
        const [added] = await fm.addFiles([makeFile('x.txt')])
        const removed = fm.removeFile(added.id)
        expect(removed).toBeDefined()
        expect(removed?.name).toBe('x.txt')
    })

    it('returns undefined for a nonexistent id', () => {
        const fm = new FileManager({})
        expect(fm.removeFile('ghost')).toBeUndefined()
    })
})

// ─────────────────────────────────────────────
// syncFromExternal
// ─────────────────────────────────────────────
describe('FileManager — syncFromExternal', () => {
    it('replaces internal files with the given map', async () => {
        const fm = new FileManager({})
        await fm.addFiles([makeFile('original.txt')])
        const external = new Map<string, any>([
            ['ext-1', makeFile('synced.txt')],
        ])
        fm.syncFromExternal(external)
        expect(fm.getFiles().size).toBe(1)
        expect(fm.getFiles().get('ext-1')?.name).toBe('synced.txt')
    })

    it('clears existing files on sync', async () => {
        const fm = new FileManager({})
        await fm.addFiles([makeFile('old.txt'), makeFile('also-old.txt')])
        fm.syncFromExternal(new Map())
        expect(fm.getFiles().size).toBe(0)
    })
})

// ─────────────────────────────────────────────
// onBeforeFileAdded returning a modified File
// ─────────────────────────────────────────────
describe('FileManager — onBeforeFileAdded returns File', () => {
    it('uses the returned File instead of the original', async () => {
        const renamed = makeFile('renamed.txt', 50, 'text/plain')
        const fm = new FileManager({
            onBeforeFileAdded: () => renamed,
        })
        const result = await fm.addFiles([makeFile('original.txt')])
        expect(result[0].name).toBe('renamed.txt')
    })
})
