import { describe, it, expect, vi } from 'vitest'
import type { UpupServerConfig } from '../src/config'

// F-501: memory-bound routing proof. Every command the (fake) S3 client
// receives is captured so we can assert on WHICH commands fired, without a
// real network/MinIO dependency. Branch on the command's constructor name —
// the AWS SDK v3 command classes are plain classes, so `instanceof` works
// against the imported class too, but constructor.name keeps this file from
// needing every command class imported just to discriminate.
const sentCommands: Array<{ name: string; input: Record<string, unknown> }> = []

vi.mock('../src/providers/s3-client', () => ({
  createS3Client: () => ({
    send: vi.fn(async (cmd: { constructor: { name: string }; input: Record<string, unknown> }) => {
      sentCommands.push({ name: cmd.constructor.name, input: cmd.input })
      switch (cmd.constructor.name) {
        case 'CreateMultipartUploadCommand':
          return { UploadId: 'mp-1' }
        case 'UploadPartCommand':
          return { ETag: '"e"' }
        default:
          return {}
      }
    }),
  }),
}))

vi.mock('@aws-sdk/s3-request-presigner', () => ({
  getSignedUrl: vi.fn().mockResolvedValue('https://signed'),
}))

const storage: UpupServerConfig['storage'] = {
  type: 'aws',
  bucket: 'test-bucket',
  region: 'us-east-1',
}

function streamOf(totalBytes: number, chunk = 1024 * 1024): ReadableStream<Uint8Array> {
  let sent = 0
  return new ReadableStream<Uint8Array>({
    pull(controller) {
      if (sent >= totalBytes) {
        controller.close()
        return
      }
      const size = Math.min(chunk, totalBytes - sent)
      controller.enqueue(new Uint8Array(size))
      sent += size
    },
  })
}

describe('transferDriveFileToS3 — memory-bound routing (F-501)', () => {
  it('routes a 4 MB transfer through a single PutObjectCommand (no multipart)', async () => {
    sentCommands.length = 0
    const { transferDriveFileToS3 } = await import('../src/transfer')
    const size = 4 * 1024 * 1024
    await transferDriveFileToS3({
      stream: streamOf(size),
      size,
      fileName: 'small.bin',
      mimeType: 'application/octet-stream',
      storage,
    })
    const names = sentCommands.map((c) => c.name)
    expect(names).toContain('PutObjectCommand')
    expect(names).not.toContain('CreateMultipartUploadCommand')
  })

  it('routes a 5 MB transfer (boundary) through a single PutObjectCommand', async () => {
    sentCommands.length = 0
    const { transferDriveFileToS3 } = await import('../src/transfer')
    const size = 5 * 1024 * 1024
    await transferDriveFileToS3({
      stream: streamOf(size),
      size,
      fileName: 'boundary.bin',
      mimeType: 'application/octet-stream',
      storage,
    })
    const names = sentCommands.map((c) => c.name)
    expect(names).toContain('PutObjectCommand')
    expect(names).not.toContain('CreateMultipartUploadCommand')
  })

  it('routes a 6 MB transfer through multipart with parts bounded to <=5 MB, no PutObjectCommand', async () => {
    sentCommands.length = 0
    const { transferDriveFileToS3 } = await import('../src/transfer')
    const size = 6 * 1024 * 1024
    await transferDriveFileToS3({
      stream: streamOf(size),
      size,
      fileName: 'big.bin',
      mimeType: 'application/octet-stream',
      storage,
    })
    const names = sentCommands.map((c) => c.name)
    expect(names).toContain('CreateMultipartUploadCommand')
    expect(names).not.toContain('PutObjectCommand')

    const uploadPartCommands = sentCommands.filter((c) => c.name === 'UploadPartCommand')
    expect(uploadPartCommands.length).toBeGreaterThanOrEqual(2)
    for (const cmd of uploadPartCommands) {
      expect(cmd.input.ContentLength as number).toBeLessThanOrEqual(5 * 1024 * 1024)
    }
  })
})
