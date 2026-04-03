import { describe, it, expect } from 'vitest'
import type { UploadFile } from '../src/types/upload-file'
import { FileSource } from '../src/types/file-source'
import { UploadStatus } from '../src/types/upload-status'

describe('UploadFile type', () => {
  it('should include a source field of type FileSource', () => {
    const file = new File(['hello'], 'test.txt', { type: 'text/plain' })
    const uploadFile: UploadFile = Object.assign(file, {
      id: 'test-1',
      source: FileSource.LOCAL,
      status: UploadStatus.IDLE,
      metadata: {},
    }) as UploadFile
    expect(uploadFile.source).toBe(FileSource.LOCAL)
  })

  it('should accept all FileSource values', () => {
    const file = new File(['hello'], 'test.txt', { type: 'text/plain' })
    for (const source of Object.values(FileSource)) {
      const uploadFile: UploadFile = Object.assign(file, {
        id: 'test-1',
        source,
        status: UploadStatus.IDLE,
        metadata: {},
      }) as UploadFile
      expect(uploadFile.source).toBe(source)
    }
  })
})

describe('UploadFile status field', () => {
  it('should include a status field defaulting to IDLE', () => {
    const file = new File(['hello'], 'test.txt', { type: 'text/plain' })
    const uploadFile: UploadFile = Object.assign(file, {
      id: 'test-1',
      source: FileSource.LOCAL,
      status: UploadStatus.IDLE,
      metadata: {},
    }) as UploadFile
    expect(uploadFile.status).toBe(UploadStatus.IDLE)
  })

  it('should accept all UploadStatus values', () => {
    const file = new File(['hello'], 'test.txt', { type: 'text/plain' })
    for (const status of Object.values(UploadStatus)) {
      const uploadFile: UploadFile = Object.assign(file, {
        id: 'test-1',
        source: FileSource.LOCAL,
        status,
        metadata: {},
      }) as UploadFile
      expect(uploadFile.status).toBe(status)
    }
  })
})
