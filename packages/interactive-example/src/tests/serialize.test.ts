import { describe, it, expect } from 'vitest'
import { encodeConfig, decodeConfig } from '../state/serialize'
import type { UpupConfig } from '../types'

describe('serialize', () => {
    it('round-trips an empty config', () => {
        const cfg: UpupConfig = {}
        expect(decodeConfig(encodeConfig(cfg))).toEqual(cfg)
    })

    it('round-trips a simple config', () => {
        const cfg = { provider: 'backblaze', maxConcurrentUploads: 3 } as UpupConfig
        expect(decodeConfig(encodeConfig(cfg))).toEqual(cfg)
    })

    it('round-trips a config with an array', () => {
        const cfg = { sources: ['local', 'camera'] } as unknown as UpupConfig
        expect(decodeConfig(encodeConfig(cfg))).toEqual(cfg)
    })

    it('round-trips a config with a nested object', () => {
        const cfg = {
            theme: {
                mode: 'dark',
                slots: {
                    uploader: { container: 'rounded-2xl border shadow-lg' },
                },
            },
        } as unknown as UpupConfig
        expect(decodeConfig(encodeConfig(cfg))).toEqual(cfg)
    })

    it('drops unknown top-level keys but keeps known ones', () => {
        const decoded = decodeConfig(encodeConfig({ bogusKey: 1, provider: 's3' } as any))
        expect(decoded).not.toHaveProperty('bogusKey')
        expect((decoded as any).provider).toBe('s3')
    })

    it('returns {} for a malformed token instead of throwing', () => {
        expect(() => decodeConfig('!!!not-valid!!!')).not.toThrow()
        expect(decodeConfig('!!!not-valid!!!')).toEqual({})
    })
})
