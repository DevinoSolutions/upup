import { describe, it, expect, beforeEach } from 'vitest'
import {
    buildS3ClientConfig,
    createS3Client,
    _resetS3ClientCacheForTests,
} from '../src/providers/s3-client'

const base = { type: 'aws', bucket: 'b', region: 'us-east-1' } as const

describe('buildS3ClientConfig', () => {
    it('sets region only for plain AWS (no endpoint, no credentials, no forcePathStyle)', () => {
        const cfg = buildS3ClientConfig({ ...base })
        expect(cfg.region).toBe('us-east-1')
        expect(cfg.endpoint).toBeUndefined()
        expect(cfg.forcePathStyle).toBeUndefined()
        expect(cfg.credentials).toBeUndefined()
    })

    it('includes credentials when accessKeyId + secretAccessKey provided', () => {
        const cfg = buildS3ClientConfig({
            ...base,
            accessKeyId: 'AK',
            secretAccessKey: 'SK',
        })
        expect(cfg.credentials).toEqual({
            accessKeyId: 'AK',
            secretAccessKey: 'SK',
        })
    })

    it('omits credentials when only one key is provided', () => {
        expect(
            buildS3ClientConfig({ ...base, accessKeyId: 'AK' }).credentials,
        ).toBeUndefined()
    })

    it('sets endpoint and defaults forcePathStyle=true (MinIO)', () => {
        const cfg = buildS3ClientConfig({
            ...base,
            endpoint: 'http://localhost:9000',
        })
        expect(cfg.endpoint).toBe('http://localhost:9000')
        expect(cfg.forcePathStyle).toBe(true)
    })

    it('honors explicit forcePathStyle=false even with an endpoint', () => {
        const cfg = buildS3ClientConfig({
            ...base,
            endpoint: 'http://localhost:9000',
            forcePathStyle: false,
        })
        expect(cfg.forcePathStyle).toBe(false)
    })
})

// Per-destination client cache (#337): multi-bucket routing must not rebuild a
// client and its connection pool on every presign, and must not silently reuse
// one across destinations or across a credential rotation.
describe('createS3Client caching', () => {
    beforeEach(() => {
        _resetS3ClientCacheForTests()
    })

    it('reuses one client for repeated calls with the same destination', () => {
        expect(createS3Client({ ...base })).toBe(createS3Client({ ...base }))
    })

    it('builds a separate client per bucket, region and endpoint', () => {
        const first = createS3Client({ ...base })
        expect(createS3Client({ ...base, bucket: 'other' })).not.toBe(first)
        expect(createS3Client({ ...base, region: 'eu-west-1' })).not.toBe(first)
        expect(
            createS3Client({ ...base, endpoint: 'http://localhost:9100' }),
        ).not.toBe(first)
    })

    it('builds a new client when the access key rotates', () => {
        const old = createS3Client({ ...base, accessKeyId: 'AK1' })
        expect(createS3Client({ ...base, accessKeyId: 'AK2' })).not.toBe(old)
    })
})
