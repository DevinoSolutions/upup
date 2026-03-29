import { describe, it, expect, vi } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { useUpupUpload } from '../src/use-upup-upload'
import { UploadStatus } from '@upup/shared'

describe('useUpupUpload', () => {
  it('initializes with IDLE status and empty files', () => {
    const { result } = renderHook(() =>
      useUpupUpload({ provider: 'aws', uploadEndpoint: '/api/upload' })
    )

    expect(result.current.status).toBe(UploadStatus.IDLE)
    expect(result.current.files).toEqual([])
    expect(result.current.error).toBeNull()
  })

  it('exposes core instance', () => {
    const { result } = renderHook(() =>
      useUpupUpload({ provider: 'aws', uploadEndpoint: '/api/upload' })
    )

    expect(result.current.core).toBeDefined()
  })

  it('adds files and updates state', async () => {
    const { result } = renderHook(() =>
      useUpupUpload({ provider: 'aws', uploadEndpoint: '/api/upload' })
    )

    const file = new File(['test'], 'test.txt', { type: 'text/plain' })
    await act(async () => {
      await result.current.addFiles([file])
    })

    expect(result.current.files.length).toBe(1)
    expect(result.current.files[0].name).toBe('test.txt')
  })

  it('removes a file', async () => {
    const { result } = renderHook(() =>
      useUpupUpload({ provider: 'aws', uploadEndpoint: '/api/upload' })
    )

    const file = new File(['test'], 'test.txt', { type: 'text/plain' })
    await act(async () => {
      await result.current.addFiles([file])
    })

    const fileId = result.current.files[0].id
    act(() => {
      result.current.removeFile(fileId)
    })

    expect(result.current.files.length).toBe(0)
  })

  it('cleans up core on unmount', () => {
    const { result, unmount } = renderHook(() =>
      useUpupUpload({ provider: 'aws', uploadEndpoint: '/api/upload' })
    )

    const core = result.current.core
    const destroySpy = vi.spyOn(core, 'destroy')

    unmount()

    expect(destroySpy).toHaveBeenCalled()
  })
})
