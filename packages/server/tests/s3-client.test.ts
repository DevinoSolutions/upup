import { describe, it, expect } from 'vitest'
import { buildS3ClientConfig } from '../src/providers/s3-client'

const base = { type: 'aws', bucket: 'b', region: 'us-east-1' } as const

describe('buildS3ClientConfig', () => {
  it('sets region only for plain AWS (no endpoint, no forcePathStyle)', () => {
    const cfg = buildS3ClientConfig({ ...base })
    expect(cfg.region).toBe('us-east-1')
    expect(cfg.endpoint).toBeUndefined()
    expect(cfg.forcePathStyle).toBeUndefined()
  })

  it('includes credentials when accessKeyId + secretAccessKey provided', () => {
    const cfg = buildS3ClientConfig({
      ...base,
      accessKeyId: 'AK',
      secretAccessKey: 'SK',
    })
    expect(cfg.credentials).toEqual({ accessKeyId: 'AK', secretAccessKey: 'SK' })
  })

  it('omits credentials when not provided (AWS default chain)', () => {
    expect(buildS3ClientConfig({ ...base }).credentials).toBeUndefined()
  })

  it('sets endpoint and defaults forcePathStyle=true (MinIO)', () => {
    const cfg = buildS3ClientConfig({ ...base, endpoint: 'http://localhost:9000' })
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
