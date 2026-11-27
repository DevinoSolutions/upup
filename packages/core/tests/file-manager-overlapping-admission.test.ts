import { describe, it, expect } from 'vitest'
import { FileManager } from '../src/file-manager'
import { UpupErrorCode } from '../src/errors'
import { FileSource } from '../src/types/file-source'

const makeFile = (name: string, size = 10, fill = 'x') =>
    new File([fill.repeat(size)], name, { type: 'text/plain' })

describe('FileManager overlapping admission', () => {
    it('admits only one of two simultaneous addFiles calls when limit is 1', async () => {
        const manager = new FileManager({ limit: 1 })

        const results = await Promise.allSettled([
            manager.addFiles([makeFile('a.txt')]),
            manager.addFiles([makeFile('b.txt')]),
        ])

        expect(results.map(r => r.status)).toEqual(['fulfilled', 'rejected'])
        const refusal = (results[1] as PromiseRejectedResult).reason
        expect(refusal).toMatchObject({ code: UpupErrorCode.LIMIT_EXCEEDED })
        expect([...manager.getFiles().values()].map(f => f.name)).toEqual([
            'a.txt',
        ])
    })

    it('refuses the second of two simultaneous admitFiles calls with LIMIT_EXCEEDED', async () => {
        const manager = new FileManager({ limit: 1 })

        const [first, second] = await Promise.all([
            manager.admitFiles([makeFile('a.txt')]),
            manager.admitFiles([makeFile('b.txt')]),
        ])

        expect(first.accepted.map(f => f.name)).toEqual(['a.txt'])
        expect(second.accepted).toEqual([])
        expect(second.refused.map(e => e.code)).toEqual([
            UpupErrorCode.LIMIT_EXCEEDED,
        ])
        expect(manager.getFiles().size).toBe(1)
    })

    it('keeps two simultaneous 10-byte files under a 15-byte maxTotalFileSize', async () => {
        const manager = new FileManager({
            maxTotalFileSize: { size: 15, unit: 'B' },
        })

        const [first, second] = await Promise.all([
            manager.admitFiles([makeFile('a.txt', 10, 'a')]),
            manager.admitFiles([makeFile('b.txt', 10, 'b')]),
        ])

        expect(first.accepted).toHaveLength(1)
        expect(second.accepted).toEqual([])
        expect(second.refused.map(e => e.code)).toEqual([
            UpupErrorCode.TOTAL_SIZE_EXCEEDED,
        ])
        const total = [...manager.getFiles().values()].reduce(
            (sum, f) => sum + f.size,
            0,
        )
        expect(total).toBe(10)
    })

    it('admits identical content once when two batches overlap with contentDeduplication on', async () => {
        const manager = new FileManager({ contentDeduplication: true })

        const [first, second] = await Promise.all([
            manager.admitFiles([makeFile('a.txt', 10, 'same')]),
            manager.admitFiles([makeFile('copy-of-a.txt', 10, 'same')]),
        ])

        expect(first.accepted).toHaveLength(1)
        expect(second.accepted).toEqual([])
        expect(manager.getFiles().size).toBe(1)
    })

    it('still admits a valid batch after an overlapping batch whose onBeforeFileAdded threw', async () => {
        const manager = new FileManager({
            limit: 1,
            onBeforeFileAdded: file => {
                if (file.name === 'boom.txt') throw new Error('hook failed')
                return true
            },
        })

        const [broken, valid] = await Promise.allSettled([
            manager.addFiles([makeFile('boom.txt')]),
            manager.addFiles([makeFile('ok.txt')]),
        ])

        expect(broken.status).toBe('rejected')
        expect(valid.status).toBe('fulfilled')
        expect([...manager.getFiles().values()].map(f => f.name)).toEqual([
            'ok.txt',
        ])
    })

    it('counts a transferred file that lands while a batch is being hashed against limit', async () => {
        const manager = new FileManager({
            limit: 1,
            contentDeduplication: true,
        })

        const pending = manager.admitFiles([makeFile('a.txt')])
        manager.addCompleted({
            name: 'drive.txt',
            size: 1,
            type: 'text/plain',
            key: 'drive-key',
            source: FileSource.GOOGLE_DRIVE,
        })
        const outcome = await pending

        expect(outcome.accepted).toEqual([])
        expect(outcome.refused.map(e => e.code)).toEqual([
            UpupErrorCode.LIMIT_EXCEEDED,
        ])
        expect([...manager.getFiles().values()].map(f => f.name)).toEqual([
            'drive.txt',
        ])
    })
})
