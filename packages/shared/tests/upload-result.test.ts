import { describe, it, expect } from 'vitest'
import type { FileUploadResult } from '../src/types/upload-result'
import type { UploadFile } from '../src/types/upload-file'
import { FileSource } from '../src/types/file-source'
import { UploadStatus } from '../src/types/upload-status'
import { UpupError } from '../src/errors'

describe('FileUploadResult type', () => {
  function makeMockUploadFile(): UploadFile {
    const file = new File(['hello'], 'test.txt', { type: 'text/plain' })
    return Object.assign(file, {
      id: 'test-1',
      source: FileSource.LOCAL,
      status: UploadStatus.SUCCESSFUL,
      metadata: {},
    }) as UploadFile
  }

  it('should represent a successful upload', () => {
    const result: FileUploadResult = {
      file: makeMockUploadFile(),
      url: 'https://cdn.example.com/test.txt',
      status: 'success',
    }
    expect(result.status).toBe('success')
    expect(result.url).toBe('https://cdn.example.com/test.txt')
    expect(result.error).toBeUndefined()
  })

  it('should represent a failed upload with error', () => {
    const error = new UpupError('Upload failed', 'UPLOAD_FAILED', true)
    const result: FileUploadResult = {
      file: makeMockUploadFile(),
      url: '',
      status: 'failed',
      error,
    }
    expect(result.status).toBe('failed')
    expect(result.error).toBe(error)
    expect(result.error?.retryable).toBe(true)
  })

  it('should represent a skipped upload', () => {
    const result: FileUploadResult = {
      file: makeMockUploadFile(),
      url: '',
      status: 'skipped',
    }
    expect(result.status).toBe('skipped')
  })
})
