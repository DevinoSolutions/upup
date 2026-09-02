// Issue #343: a first-class primitive for signing a GET against an EXISTING
// key, plus a config knob for the download-URL TTL that was hardcoded to 3 days.
//
// Mocks at the provider boundary (the presigner + the S3 client factory) the
// same way transfer.test.ts does, so the real providers/aws.ts signing path
// runs and the expiry actually threads through it.
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { UpupConfigError } from '@useupup/core'

const signed: Array<{
    expiresIn: number | undefined
    command: string
    bucket: unknown
    key: unknown
}> = []

vi.mock('@aws-sdk/s3-request-presigner', () => ({
    getSignedUrl: vi.fn(
        async (
            _client: unknown,
            cmd: {
                constructor: { name: string }
                input: Record<string, unknown>
            },
            opts?: { expiresIn?: number },
        ) => {
            signed.push({
                expiresIn: opts?.expiresIn,
                command: cmd.constructor.name,
                bucket: cmd.input.Bucket,
                key: cmd.input.Key,
            })
            return `https://signed.example/${String(cmd.input.Key)}`
        },
    ),
}))

vi.mock('../src/providers/s3-client', () => ({
    createS3Client: () => ({ send: vi.fn(async () => ({})) }),
    buildS3ClientConfig: () => ({ region: 'us-east-1' }),
}))

import { getDownloadUrl } from '../src/download-url'
import { generatePresignedUrl } from '../src/providers/aws'

const THREE_DAYS = 3600 * 24 * 3

const storage = {
    type: 'aws',
    bucket: 'gated-files',
    region: 'us-east-1',
    accessKeyId: 'AK',
    secretAccessKey: 'SK',
}

beforeEach(() => {
    signed.length = 0
})

describe('getDownloadUrl (#343)', () => {
    it('signs a GET for an existing key against the configured bucket', async () => {
        const url = await getDownloadUrl({ storage }, 'user-1/old/report.pdf')
        expect(url).toBe('https://signed.example/user-1/old/report.pdf')
        expect(signed).toHaveLength(1)
        expect(signed[0]?.command).toBe('GetObjectCommand')
        expect(signed[0]?.bucket).toBe('gated-files')
        expect(signed[0]?.key).toBe('user-1/old/report.pdf')
    })

    it('defaults the expiry to three days when nothing overrides it', async () => {
        await getDownloadUrl({ storage }, 'k')
        expect(signed[0]?.expiresIn).toBe(THREE_DAYS)
    })

    it('honours config.downloadUrlExpiresIn over the default', async () => {
        await getDownloadUrl({ storage, downloadUrlExpiresIn: 900 }, 'k')
        expect(signed[0]?.expiresIn).toBe(900)
    })

    it('lets a per-call expiresIn win over the config knob', async () => {
        await getDownloadUrl({ storage, downloadUrlExpiresIn: 900 }, 'k', {
            expiresIn: 60,
        })
        expect(signed[0]?.expiresIn).toBe(60)
    })

    it('rejects a storage provider with no S3 surface', async () => {
        await expect(
            getDownloadUrl({ storage: { ...storage, type: 'azure' } }, 'k'),
        ).rejects.toBeInstanceOf(UpupConfigError)
        expect(signed).toHaveLength(0)
    })
})

describe('downloadUrlExpiresIn threads into the presign response (#343)', () => {
    it('signs the returned downloadUrl with the configured TTL', async () => {
        await generatePresignedUrl(storage, 'k.png', 'image/png', 10, 3600, 900)
        const get = signed.find(s => s.command === 'GetObjectCommand')
        expect(get?.expiresIn).toBe(900)
    })

    it('still signs the downloadUrl for three days when unset', async () => {
        await generatePresignedUrl(storage, 'k.png', 'image/png', 10)
        const get = signed.find(s => s.command === 'GetObjectCommand')
        expect(get?.expiresIn).toBe(THREE_DAYS)
    })
})
