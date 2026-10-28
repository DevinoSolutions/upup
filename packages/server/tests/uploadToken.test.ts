import { describe, it, expect } from 'vitest'
import {
    signUploadToken,
    verifyUploadToken,
    assertUploadTokenSecret,
    UploadTokenError,
    DEFAULT_UPLOAD_TOKEN_TTL_SECONDS,
    type UploadTokenPayload,
} from '../src/uploadToken'

const SECRET = 'unit-test-secret-0123456789abcdef'
const now = 1_750_000_000_000 // fixed ms
const payload = (
    over: Partial<UploadTokenPayload> = {},
): UploadTokenPayload => ({
    k: 'alice/uuid/file.bin',
    u: 'upload-123',
    uid: 'alice',
    smin: 0,
    smax: 2048,
    ps: 5 * 1024 * 1024,
    iat: Math.floor(now / 1000),
    exp: Math.floor(now / 1000) + DEFAULT_UPLOAD_TOKEN_TTL_SECONDS,
    ...over,
})

describe('uploadToken', () => {
    it('round-trips a valid token', async () => {
        const tok = await signUploadToken(SECRET, payload())
        const out = await verifyUploadToken(SECRET, tok, now)
        expect(out).toEqual(payload())
    })

    it('rejects a tampered payload', async () => {
        const tok = await signUploadToken(SECRET, payload())
        const [, sig] = tok.split('.')
        const forgedBody = Buffer.from(
            JSON.stringify(payload({ k: 'attacker/evil.bin' })),
        ).toString('base64url')
        await expect(
            verifyUploadToken(SECRET, `${forgedBody}.${sig}`, now),
        ).rejects.toThrow(UploadTokenError)
    })

    it('rejects a wrong-secret signature', async () => {
        const tok = await signUploadToken(SECRET, payload())
        await expect(
            verifyUploadToken('a-different-secret-0123456789', tok, now),
        ).rejects.toMatchObject({
            code: 'bad_signature',
        })
    })

    it('rejects an expired token', async () => {
        const tok = await signUploadToken(
            SECRET,
            payload({ exp: Math.floor(now / 1000) - 1 }),
        )
        await expect(verifyUploadToken(SECRET, tok, now)).rejects.toMatchObject(
            {
                code: 'expired',
            },
        )
    })

    it('rejects a malformed token', async () => {
        await expect(
            verifyUploadToken(SECRET, 'not-a-token', now),
        ).rejects.toMatchObject({
            code: 'malformed',
        })
    })

    // Phase 5b: smin/smax must be validated as numbers, same as k/u/exp — a
    // payload with a stringified (or missing) envelope must be treated as
    // malformed, never silently trusted downstream by the multipart-size guard.
    it('rejects a payload with non-numeric smin/smax', async () => {
        const badPayload = {
            ...payload(),
            smin: '0',
            smax: '2048',
        } as unknown as UploadTokenPayload
        const tok = await signUploadToken(SECRET, badPayload)
        await expect(verifyUploadToken(SECRET, tok, now)).rejects.toMatchObject(
            {
                code: 'malformed',
            },
        )
    })

    // T-6185: the part size is half of the signed length binding. A validly
    // signed token that lacks it (minted before the binding existed) or carries
    // an unusable value is malformed on every route that verifies tokens.
    it.each([
        ['absent', undefined],
        ['zero', 0],
        ['negative', -1],
        ['fractional', 5.5],
        ['a string', '5242880'],
        ['null', null],
    ])(
        'rejects a validly signed token whose part size is %s',
        async (_n, ps) => {
            const legacy = { ...payload(), ps } as unknown as UploadTokenPayload
            const tok = await signUploadToken(SECRET, legacy)
            await expect(
                verifyUploadToken(SECRET, tok, now),
            ).rejects.toMatchObject({
                code: 'malformed',
            })
        },
    )

    it.each([
        ['absent', undefined],
        ['a string', '1750000000'],
        ['null', null],
        ['NaN', Number.NaN],
    ])(
        'rejects a validly signed token whose issue time is %s',
        async (_n, iat) => {
            const legacy = {
                ...payload(),
                iat,
            } as unknown as UploadTokenPayload
            const tok = await signUploadToken(SECRET, legacy)
            await expect(
                verifyUploadToken(SECRET, tok, now),
            ).rejects.toMatchObject({
                code: 'malformed',
            })
        },
    )

    it('assertUploadTokenSecret throws on missing/short secret', () => {
        expect(() => assertUploadTokenSecret(undefined)).toThrow()
        expect(() => assertUploadTokenSecret('short')).toThrow()
        expect(() => assertUploadTokenSecret(SECRET)).not.toThrow()
    })
})
