import { describe, it, expect } from 'vitest'
import type { UploadFile, UploadFileMetadata } from '../src/types/upload-file'
import { FileSource } from '../src/types/file-source'
import { UploadStatus } from '../src/types/upload-status'

describe('UploadFile metadata', () => {
  function makeUploadFile(metadataOverrides: Partial<UploadFileMetadata> = {}): UploadFile {
    const file = new File(['hello'], 'test.txt', { type: 'text/plain' })
    return Object.assign(file, {
      id: 'test-1',
      source: FileSource.LOCAL,
      status: UploadStatus.IDLE,
      metadata: {
        width: undefined,
        height: undefined,
        duration: undefined,
        thumbnailUrl: undefined,
        checksum: undefined,
        originalContentHash: undefined,
        ...metadataOverrides,
      },
    }) as UploadFile
  }

  it('should have a metadata object with optional fields', () => {
    const uploadFile = makeUploadFile()
    expect(uploadFile.metadata).toBeDefined()
    expect(uploadFile.metadata.width).toBeUndefined()
    expect(uploadFile.metadata.height).toBeUndefined()
    expect(uploadFile.metadata.duration).toBeUndefined()
    expect(uploadFile.metadata.thumbnailUrl).toBeUndefined()
    expect(uploadFile.metadata.checksum).toBeUndefined()
    expect(uploadFile.metadata.originalContentHash).toBeUndefined()
  })

  it('should accept populated metadata', () => {
    const uploadFile = makeUploadFile({
      width: 1920,
      height: 1080,
      duration: 120.5,
      thumbnailUrl: 'https://example.com/thumb.jpg',
      checksum: 'abc123',
      originalContentHash: 'def456',
    })
    expect(uploadFile.metadata.width).toBe(1920)
    expect(uploadFile.metadata.height).toBe(1080)
    expect(uploadFile.metadata.duration).toBe(120.5)
    expect(uploadFile.metadata.thumbnailUrl).toBe('https://example.com/thumb.jpg')
    expect(uploadFile.metadata.checksum).toBe('abc123')
    expect(uploadFile.metadata.originalContentHash).toBe('def456')
  })

  it('should still have legacy flat fields as deprecated optional', () => {
    const uploadFile = makeUploadFile()
    // Legacy fields should still be accessible but optional
    expect(uploadFile.fileHash).toBeUndefined()
    expect(uploadFile.checksumSHA256).toBeUndefined()
    expect(uploadFile.thumbnail).toBeUndefined()
  })
})
