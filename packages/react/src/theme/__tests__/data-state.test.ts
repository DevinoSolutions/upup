import { describe, it, expect } from 'vitest'
import { deriveDataState } from '../data-state'
import { UploadStatus } from '@upup/shared'

describe('deriveDataState', () => {
  it('returns "idle" when status is IDLE and not dragging', () => {
    expect(deriveDataState(UploadStatus.IDLE, false)).toBe('idle')
  })

  it('returns "dragging" when isDragging is true regardless of status', () => {
    expect(deriveDataState(UploadStatus.IDLE, true)).toBe('dragging')
    expect(deriveDataState(UploadStatus.UPLOADING, true)).toBe('dragging')
  })

  it('returns "uploading" when status is UPLOADING', () => {
    expect(deriveDataState(UploadStatus.UPLOADING, false)).toBe('uploading')
  })

  it('returns "paused" when status is PAUSED', () => {
    expect(deriveDataState(UploadStatus.PAUSED, false)).toBe('paused')
  })

  it('returns "successful" when status is SUCCESSFUL', () => {
    expect(deriveDataState(UploadStatus.SUCCESSFUL, false)).toBe('successful')
  })

  it('returns "failed" when status is FAILED', () => {
    expect(deriveDataState(UploadStatus.FAILED, false)).toBe('failed')
  })
})
