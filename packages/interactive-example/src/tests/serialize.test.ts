import { describe, it, expect, vi } from 'vitest'
import { serialize } from '../state/serialize'
import { deserialize } from '../state/deserialize'
import type { UpupConfig } from '../types'

describe('serialize / deserialize round-trip', () => {
    const cases: Array<{ name: string; config: UpupConfig }> = [
        { name: 'empty', config: {} },
        { name: 'simple primitive', config: { provider: 'backblaze' as any } },
        {
            name: 'several props',
            config: {
                provider: 'backblaze' as any,
                serverUrl: '/api/upup',
                maxConcurrentUploads: 5,
                resumable: true as any,
            },
        },
        {
            name: 'nested cloudDrives',
            config: {
                cloudDrives: {
                    googleDrive: { clientId: 'abc', apiKey: 'def', appId: 'ghi' },
                    oneDrive: { clientId: 'jkl' },
                } as any,
            },
        },
        {
            name: 'unicode in i18n overrides',
            config: {
                i18n: {
                    overrides: { 'common.upload': 'アップロード' },
                } as any,
            },
        },
    ]

    for (const c of cases) {
        it(`${c.name} round-trips`, () => {
            const token = serialize(c.config)
            const restored = deserialize(token)
            expect(restored).toEqual(c.config)
        })
    }

    it('empty config produces empty token', () => {
        expect(serialize({})).toBe('')
    })

    it('deserialize("") returns empty object', () => {
        expect(deserialize('')).toEqual({})
    })

    it('deserialize of malformed token returns empty object and warns', () => {
        const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})
        expect(deserialize('garbage-not-base64!!!')).toEqual({})
        expect(warnSpy).toHaveBeenCalled()
        warnSpy.mockRestore()
    })
})
