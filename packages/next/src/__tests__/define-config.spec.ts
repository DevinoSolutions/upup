import { describe, it, expect } from 'vitest'
import { defineUpupConfig } from '../define-config'

const validStorage = {
  type: 'aws',
  bucket: 'b',
  region: 'us-east-1',
  accessKeyId: 'id',
  secretAccessKey: 'secret',
}

describe('defineUpupConfig', () => {
  it('returns the same config object when valid', () => {
    const cfg = { storage: validStorage }
    expect(defineUpupConfig(cfg)).toBe(cfg)
  })

  it('allows storage with no creds (IAM role)', () => {
    const cfg = { storage: { type: 'aws', bucket: 'b', region: 'r' } }
    expect(() => defineUpupConfig(cfg)).not.toThrow()
  })

  it('throws listing every missing storage field', () => {
    const cfg = { storage: { type: 'aws', bucket: '', region: '' } }
    expect(() => defineUpupConfig(cfg)).toThrow(/storage\.bucket/)
    expect(() => defineUpupConfig(cfg)).toThrow(/storage\.region/)
  })

  it('flags a half-set credential pair (the process.env.X! "" bug)', () => {
    const cfg = {
      storage: { type: 'aws', bucket: 'b', region: 'r', accessKeyId: 'id', secretAccessKey: '' },
    }
    expect(() => defineUpupConfig(cfg)).toThrow(/storage\.secretAccessKey/)
  })

  it('flags an absent secret when only accessKeyId is set', () => {
    const cfg = {
      storage: { type: 'aws', bucket: 'b', region: 'r', accessKeyId: 'id' },
    }
    expect(() => defineUpupConfig(cfg)).toThrow(/storage\.secretAccessKey/)
  })

  it('requires provider creds only when that provider is configured', () => {
    const cfg = {
      storage: validStorage,
      providers: { googleDrive: { clientId: 'id', clientSecret: '' } },
    }
    expect(() => defineUpupConfig(cfg)).toThrow(/providers\.googleDrive\.clientSecret/)
  })

  it('does not require creds for providers that are absent', () => {
    const cfg = { storage: validStorage, providers: {} }
    expect(() => defineUpupConfig(cfg)).not.toThrow()
  })
})
