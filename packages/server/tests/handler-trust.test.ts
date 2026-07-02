// packages/server/tests/handler-trust.test.ts
import { describe, it, expect, vi } from 'vitest'
import { createUpupHandler } from '../src/handler'

vi.mock('../src/providers/aws', () => ({
  generatePresignedUrl: vi.fn(),
  initiateMultipartUpload: vi.fn(),
  generatePresignedPartUrl: vi.fn(),
  completeMultipartUpload: vi.fn(),
  abortMultipartUpload: vi.fn(),
  listMultipartParts: vi.fn(),
  getMultipartUploadedSize: vi.fn().mockResolvedValue(0),
}))

const storage = { type: 'aws', bucket: 'b', region: 'us-east-1' } as const
const SECRET = 'construction-test-secret-0123456789'

describe('createUpupHandler — construction validation', () => {
  it('throws without uploadTokenSecret', () => {
    expect(() => createUpupHandler({ storage } as any)).toThrow(/uploadTokenSecret/)
  })

  it('throws with a too-short secret', () => {
    expect(() => createUpupHandler({ storage, uploadTokenSecret: 'short' } as any)).toThrow(
      /uploadTokenSecret/,
    )
  })

  it('throws when providers are set without getUserId or allowAnonymous', () => {
    expect(() =>
      createUpupHandler({
        storage,
        uploadTokenSecret: SECRET,
        providers: { googleDrive: { clientId: 'x', clientSecret: 'y' } },
      } as any),
    ).toThrow(/getUserId/)
  })

  it('does not throw when allowAnonymous is set', () => {
    expect(() =>
      createUpupHandler({
        storage,
        uploadTokenSecret: SECRET,
        providers: { googleDrive: { clientId: 'x', clientSecret: 'y' } },
        allowAnonymous: true,
      } as any),
    ).not.toThrow()
  })

  it('does not throw when getUserId is provided', () => {
    expect(() =>
      createUpupHandler({
        storage,
        uploadTokenSecret: SECRET,
        providers: { googleDrive: { clientId: 'x', clientSecret: 'y' } },
        getUserId: async () => 'u1',
      } as any),
    ).not.toThrow()
  })

  it('upload-only needs the secret but no getUserId', () => {
    expect(() => createUpupHandler({ storage, uploadTokenSecret: SECRET } as any)).not.toThrow()
  })
})
