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
    it('accepts any file for bare wildcard', () => {
        const f = makeFile('notes.txt', 100, 'text/plain')
        expect(matchesAccept(f, '*')).toBe(true)
    })

    it('accepts any file for MIME wildcard', () => {
        const f = makeFile('notes.txt', 100, 'text/plain')
        expect(matchesAccept(f, '*/*')).toBe(true)
    })

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

// ─────────────────────────────────────────────
// contentDeduplication
// ─────────────────────────────────────────────
describe('FileManager — contentDeduplication', () => {
    it('skips duplicate content in the same batch', async () => {
        const fm = new FileManager({ contentDeduplication: true })
        const content = 'same bytes'
        const result = await fm.addFiles([
            new File([content], 'a.txt', { type: 'text/plain' }),
            new File([content], 'b.txt', { type: 'text/plain' }),
        ])

        expect(result).toHaveLength(1)
        expect(fm.getFiles().size).toBe(1)
        expect(result[0].fileHash).toBeDefined()
        expect(result[0].metadata?.originalContentHash).toBe(result[0].fileHash)
    })

    it('skips duplicate content against existing files', async () => {
        const fm = new FileManager({ contentDeduplication: true })
        await fm.addFiles([new File(['same bytes'], 'first.txt', { type: 'text/plain' })])
        const result = await fm.addFiles([new File(['same bytes'], 'second.txt', { type: 'text/plain' })])

        expect(result).toHaveLength(0)
        expect(fm.getFiles().size).toBe(1)
    })

    it('keeps different content even when size matches', async () => {
        const fm = new FileManager({ contentDeduplication: true })
        const result = await fm.addFiles([
            new File(['abc'], 'a.txt', { type: 'text/plain' }),
            new File(['xyz'], 'b.txt', { type: 'text/plain' }),
        ])

        expect(result).toHaveLength(2)
        expect(fm.getFiles().size).toBe(2)
    })
})
