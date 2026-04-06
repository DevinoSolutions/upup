import { describe, it, expect, vi } from 'vitest'
import { UpupCore } from '../src/core'
import { UploadStatus } from '@upup/shared'
import type { UploadFile } from '@upup/shared'

const makeCore = () =>
    new UpupCore({ provider: 'aws', uploadEndpoint: '/api/upload' })

function makeUploadFile(id: string): UploadFile {
    return Object.assign(new File(['x'], `${id}.txt`, { type: 'text/plain' }), {
        id,
        url: null,
        relativePath: null,
        key: null,
        fileHash: null,
        checksumSHA256: null,
        etag: null,
        thumbnail: null,
    }) as unknown as UploadFile
}

// ─────────────────────────────────────────────
// syncFilesFromExternal → files-synced
// ─────────────────────────────────────────────
describe('UpupCore — files-synced event', () => {
    it('emits files-synced with the correct count', () => {
        const core = makeCore()
        const handler = vi.fn()
        core.on('files-synced', handler)

        const external = new Map<string, UploadFile>([
            ['f1', makeUploadFile('f1')],
            ['f2', makeUploadFile('f2')],
        ])
        core.syncFilesFromExternal(external)

        expect(handler).toHaveBeenCalledWith({ count: 2 })
    })

    it('emits files-synced with count 0 for empty map', () => {
        const core = makeCore()
        const handler = vi.fn()
        core.on('files-synced', handler)

        core.syncFilesFromExternal(new Map())

        expect(handler).toHaveBeenCalledWith({ count: 0 })
    })

    it('updates the internal file state after sync', () => {
        const core = makeCore()
        const file = makeUploadFile('x')
        core.syncFilesFromExternal(new Map([['x', file]]))
        expect(core.files.size).toBe(1)
    })

    it('multiple calls emit separate events', () => {
        const core = makeCore()
        const handler = vi.fn()
        core.on('files-synced', handler)

        core.syncFilesFromExternal(new Map([['a', makeUploadFile('a')]]))
        core.syncFilesFromExternal(new Map())

        expect(handler).toHaveBeenCalledTimes(2)
        expect(handler).toHaveBeenNthCalledWith(1, { count: 1 })
        expect(handler).toHaveBeenNthCalledWith(2, { count: 0 })
    })
})

// ─────────────────────────────────────────────
// syncStatusFromExternal → status-synced
// ─────────────────────────────────────────────
describe('UpupCore — status-synced event', () => {
    it('emits status-synced with the new status', () => {
        const core = makeCore()
        const handler = vi.fn()
        core.on('status-synced', handler)

        core.syncStatusFromExternal(UploadStatus.UPLOADING)

        expect(handler).toHaveBeenCalledWith({ status: UploadStatus.UPLOADING })
    })

    it('updates core.status after sync', () => {
        const core = makeCore()
        core.syncStatusFromExternal(UploadStatus.SUCCESSFUL)
        expect(core.status).toBe(UploadStatus.SUCCESSFUL)
    })

    it('emits for every status value', () => {
        const core = makeCore()
        const handler = vi.fn()
        core.on('status-synced', handler)

        const statuses = [
            UploadStatus.IDLE,
            UploadStatus.UPLOADING,
            UploadStatus.PAUSED,
            UploadStatus.SUCCESSFUL,
            UploadStatus.FAILED,
        ]
        for (const s of statuses) {
            core.syncStatusFromExternal(s)
        }

        expect(handler).toHaveBeenCalledTimes(statuses.length)
    })
})
