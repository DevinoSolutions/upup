import { describe, it, expect } from 'vitest'
import {
    serializeCrashRecovery,
    reviveCrashRecoverySnapshot,
} from '../src/crash-recovery-serializer'
import { UploadStatus } from '../src/types/upload-status'
import { FileSource } from '../src/types/file-source'
import type { UploadFile } from '../src/types/upload-file'

function uploadFile(id: string, name: string): UploadFile {
    const f = new File([new Uint8Array(4)], name, { type: 'text/plain' })
    return Object.assign(f, {
        id,
        source: FileSource.LOCAL,
        status: UploadStatus.READY,
        metadata: {},
    }) as UploadFile
}

describe('serializeCrashRecovery', () => {
    it('serializes a file map into snapshot entries with status', () => {
        const snap = serializeCrashRecovery(
            new Map([['a', uploadFile('a', 'a.txt')]]),
            UploadStatus.UPLOADING,
        )
        expect(snap.status).toBe(UploadStatus.UPLOADING)
        expect(snap.files).toHaveLength(1)
        expect(snap.files[0]![0]).toBe('a')
        expect(snap.files[0]![1].name).toBe('a.txt')
    })

    it('drops blob: URLs but preserves real URLs', () => {
        const blobFile = uploadFile('b', 'b.txt')
        blobFile.url = 'blob:http://x/y'
        const cdnFile = uploadFile('c', 'c.txt')
        cdnFile.url = 'https://cdn/c.txt'
        const snap = serializeCrashRecovery(
            new Map([
                ['b', blobFile],
                ['c', cdnFile],
            ]),
            UploadStatus.READY,
        )
        expect((snap.files[0]![1] as { url?: string }).url).toBeUndefined()
        expect((snap.files[1]![1] as { url?: string }).url).toBe(
            'https://cdn/c.txt',
        )
    })
})

describe('reviveCrashRecoverySnapshot', () => {
    it('returns null for non-record / malformed input', () => {
        expect(reviveCrashRecoverySnapshot(null)).toBeNull()
        expect(reviveCrashRecoverySnapshot({ files: 'nope' })).toBeNull()
    })

    it('round-trips a serialized snapshot', () => {
        const snap = serializeCrashRecovery(
            new Map([['a', uploadFile('a', 'a.txt')]]),
            UploadStatus.PAUSED,
        )
        const revived = reviveCrashRecoverySnapshot(snap)
        expect(revived).not.toBeNull()
        expect(revived!.status).toBe(UploadStatus.PAUSED)
        expect(revived!.files[0]![0]).toBe('a')
        expect(revived!.files[0]![1].name).toBe('a.txt')
    })

    it('defaults invalid status to IDLE', () => {
        expect(
            reviveCrashRecoverySnapshot({ files: [], status: 'BOGUS' })!.status,
        ).toBe(UploadStatus.IDLE)
    })
})
