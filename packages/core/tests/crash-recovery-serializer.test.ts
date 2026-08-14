import { describe, it, expect } from 'vitest'
import {
    serializeCrashRecovery,
    reviveCrashRecoverySnapshot,
} from '../src/crash-recovery-serializer'
import { UploadStatus } from '../src/types/upload-status'
import { FileSource } from '../src/types/file-source'
import { fileFingerprint } from '../src/utils/multipart-session-store'
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

// Cross-reload multipart resume looks a restored file up by
// `name:size:lastModified:type` (fileFingerprint). If revival changed ANY of
// those four, a crash-recovered file would silently fail to match its own
// saved session and restart from part 1 — so the round trip is pinned here,
// including the degraded path where only the raw Blob survived storage.
describe('crash-recovery revival preserves the multipart fingerprint', () => {
    function fingerprintableFile(): UploadFile {
        const f = new File([new Uint8Array(2048)], 'holiday.mp4', {
            type: 'video/mp4',
            lastModified: 1_700_000_000_000,
        })
        return Object.assign(f, {
            id: 'v1',
            source: FileSource.LOCAL,
            status: UploadStatus.UPLOADING,
            metadata: {},
        }) as UploadFile
    }

    it('keeps name, size, lastModified and type byte-identical through a full round trip', () => {
        const original = fingerprintableFile()
        const snap = serializeCrashRecovery(
            new Map([['v1', original]]),
            UploadStatus.UPLOADING,
        )

        const revived = reviveCrashRecoverySnapshot(snap)!.files[0]![1]

        expect(revived.name).toBe('holiday.mp4')
        expect(revived.size).toBe(2048)
        expect(revived.lastModified).toBe(1_700_000_000_000)
        expect(revived.type).toBe('video/mp4')
        expect(fileFingerprint(revived)).toBe(fileFingerprint(original))
    })

    it('rebuilds the same fingerprint from the snapshot fields when only a bare Blob survived storage', () => {
        const original = fingerprintableFile()
        const snap = serializeCrashRecovery(
            new Map([['v1', original]]),
            UploadStatus.UPLOADING,
        )
        // Structured-clone round trips can hand back a plain Blob rather than a
        // File; revival must then reconstruct the identity from the snapshot's
        // own name/type/lastModified fields.
        const degraded = {
            ...snap,
            files: [
                [
                    'v1',
                    {
                        ...(snap.files[0]![1] as Record<string, unknown>),
                        file: new Blob([new Uint8Array(2048)], {
                            type: 'video/mp4',
                        }),
                    },
                ],
            ],
        }

        const revived = reviveCrashRecoverySnapshot(degraded)!.files[0]![1]

        expect(fileFingerprint(revived)).toBe(fileFingerprint(original))
    })
})
