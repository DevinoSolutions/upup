import { describe, it, expect, vi } from 'vitest'
import { useUpupUpload } from '../src/use-upup-upload'
import { withSetup } from './helpers'

describe('useUpupUpload', () => {
  it('returns reactive files and status', () => {
    const { result, unmount } = withSetup(() => useUpupUpload({ limit: 5 }))
    expect(result.files.value).toEqual([])
    expect(result.status.value).toBe('IDLE')
    expect(result.core).toBeDefined()
    unmount()
  })

  it('exposes upload/pause/resume/cancel methods', () => {
    const { result, unmount } = withSetup(() => useUpupUpload({ limit: 5 }))
    expect(typeof result.upload).toBe('function')
    expect(typeof result.pause).toBe('function')
    expect(typeof result.resume).toBe('function')
    expect(typeof result.cancel).toBe('function')
    unmount()
  })

  it('destroys core on unmount', () => {
    const { result, unmount } = withSetup(() => useUpupUpload({ limit: 5 }))
    const destroySpy = vi.spyOn(result.core, 'destroy')
    unmount()
    expect(destroySpy).toHaveBeenCalled()
  })
})
