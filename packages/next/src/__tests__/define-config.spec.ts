import { describe, it, expect } from 'vitest'
import { defineUpupConfig } from '../define-config'
import { createUpupNextHandler } from '../server'
import type { UpupServerConfig } from '@upup/server'

const secret = 'x'.repeat(32)
const validStorage = {
    type: 'aws',
    bucket: 'b',
    region: 'us-east-1',
    accessKeyId: 'id',
    secretAccessKey: 'secret',
}

describe('defineUpupConfig — typed pass-through (F-852)', () => {
    it('returns the same config object unchanged', () => {
        const cfg = { storage: validStorage, uploadTokenSecret: secret }
        expect(defineUpupConfig(cfg)).toBe(cfg)
    })

    it('no longer validates on its own — the guard moved to construct time', () => {
        // A wrapper that validated by itself left direct createUpupNextHandler
        // callers unprotected (the original F-852 bug). defineUpupConfig is now
        // a typed pass-through; required-field validation lives in the handler.
        const partial = {
            storage: { type: 'aws', bucket: '', region: '' },
        } as unknown as UpupServerConfig
        expect(() => defineUpupConfig(partial)).not.toThrow()
    })
})

describe('createUpupNextHandler — construct-time validation runs without the wrapper (F-852)', () => {
    it('throws listing missing storage fields', () => {
        expect(() =>
            createUpupNextHandler({
                storage: { type: 'aws', bucket: '', region: '' },
                uploadTokenSecret: secret,
            } as unknown as UpupServerConfig),
        ).toThrow(/storage\.bucket/)
    })

    it('throws on a half-set credential pair (the process.env.X! "" bug)', () => {
        expect(() =>
            createUpupNextHandler({
                storage: {
                    type: 'aws',
                    bucket: 'b',
                    region: 'r',
                    accessKeyId: 'id',
                    secretAccessKey: '',
                },
                uploadTokenSecret: secret,
            } as unknown as UpupServerConfig),
        ).toThrow(/storage\.secretAccessKey/)
    })

    it('requires provider creds only when that provider is configured', () => {
        expect(() =>
            createUpupNextHandler({
                storage: validStorage,
                uploadTokenSecret: secret,
                providers: {
                    googleDrive: { clientId: 'id', clientSecret: '' },
                },
            } as unknown as UpupServerConfig),
        ).toThrow(/providers\.googleDrive\.clientSecret/)
    })

    it('accepts a fully valid config (creds present)', () => {
        expect(() =>
            createUpupNextHandler({
                storage: validStorage,
                uploadTokenSecret: secret,
            }),
        ).not.toThrow()
    })

    it('accepts storage with no creds (IAM role)', () => {
        expect(() =>
            createUpupNextHandler({
                storage: { type: 'aws', bucket: 'b', region: 'r' },
                uploadTokenSecret: secret,
            }),
        ).not.toThrow()
    })
})
