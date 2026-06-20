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
const payload = (over: Partial<UploadTokenPayload> = {}): UploadTokenPayload => ({
  k: 'alice/uuid/file.bin',
  u: 'upload-123',
  uid: 'alice',
  smin: 0,
  smax: 2048,
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
    const [body, sig] = tok.split('.')
    const forgedBody = Buffer.from(
      JSON.stringify(payload({ k: 'attacker/evil.bin' })),
    ).toString('base64url')
    await expect(verifyUploadToken(SECRET, `${forgedBody}.${sig}`, now)).rejects.toThrow(
      UploadTokenError,
    )
  })

  it('rejects a wrong-secret signature', async () => {
    const tok = await signUploadToken(SECRET, payload())
    await expect(verifyUploadToken('a-different-secret-0123456789', tok, now)).rejects.toMatchObject({
      code: 'bad_signature',
    })
  })

  it('rejects an expired token', async () => {
    const tok = await signUploadToken(SECRET, payload({ exp: Math.floor(now / 1000) - 1 }))
    await expect(verifyUploadToken(SECRET, tok, now)).rejects.toMatchObject({ code: 'expired' })
  })

  it('rejects a malformed token', async () => {
    await expect(verifyUploadToken(SECRET, 'not-a-token', now)).rejects.toMatchObject({
      code: 'malformed',
    })
  })

  it('assertUploadTokenSecret throws on missing/short secret', () => {
    expect(() => assertUploadTokenSecret(undefined)).toThrow()
    expect(() => assertUploadTokenSecret('short')).toThrow()
    expect(() => assertUploadTokenSecret(SECRET)).not.toThrow()
  })
})
