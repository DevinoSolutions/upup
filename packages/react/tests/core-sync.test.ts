import { describe, it, expect, vi } from 'vitest'
import { UpupCore } from '@upup/core'
import { UploadStatus, FileSource } from '@upup/shared'
import type { UploadFile } from '@upup/shared'

function createMockUploadFile(name: string, id: string): UploadFile {
  const file = new File(['content'], name, { type: 'text/plain' })
  return Object.assign(file, {
    id,
    source: FileSource.LOCAL,
    status: UploadStatus.IDLE,
    metadata: {},
    url: undefined,
    relativePath: undefined,
    key: undefined,
    etag: undefined,
    fileHash: undefined,
    checksumSHA256: undefined,
    thumbnail: undefined,
  }) as UploadFile
}

describe('UpupCore.syncFilesFromExternal', () => {
  it('syncs files into core from external map', () => {
    const core = new UpupCore({ uploadEndpoint: '/test' })
    const filesMap = new Map<string, UploadFile>()
    const file1 = createMockUploadFile('test1.txt', 'id-1')
    const file2 = createMockUploadFile('test2.txt', 'id-2')
    filesMap.set('id-1', file1)
    filesMap.set('id-2', file2)

    core.syncFilesFromExternal(filesMap)

    expect(core.files.size).toBe(2)
    expect(core.files.get('id-1')?.name).toBe('test1.txt')
    expect(core.files.get('id-2')?.name).toBe('test2.txt')
  })

  it('replaces existing files on re-sync', () => {
    const core = new UpupCore({ uploadEndpoint: '/test' })

    // First sync: 2 files
    const map1 = new Map<string, UploadFile>()
    map1.set('id-1', createMockUploadFile('a.txt', 'id-1'))
    map1.set('id-2', createMockUploadFile('b.txt', 'id-2'))
    core.syncFilesFromExternal(map1)
    expect(core.files.size).toBe(2)

    // Second sync: only 1 file (simulates removal)
    const map2 = new Map<string, UploadFile>()
    map2.set('id-1', createMockUploadFile('a.txt', 'id-1'))
    core.syncFilesFromExternal(map2)
    expect(core.files.size).toBe(1)
    expect(core.files.has('id-2')).toBe(false)
  })

  it('clears files when synced with empty map', () => {
    const core = new UpupCore({ uploadEndpoint: '/test' })

    const map = new Map<string, UploadFile>()
    map.set('id-1', createMockUploadFile('test.txt', 'id-1'))
    core.syncFilesFromExternal(map)
    expect(core.files.size).toBe(1)

    core.syncFilesFromExternal(new Map())
    expect(core.files.size).toBe(0)
  })
})

describe('UpupCore.emit (public event bridging)', () => {
  it('emits events that listeners can receive', () => {
    const core = new UpupCore({ uploadEndpoint: '/test' })
    const handler = vi.fn()

    core.on('files-added', handler)
    const mockFiles = [createMockUploadFile('test.txt', 'id-1')]
    core.emit('files-added', mockFiles)

    expect(handler).toHaveBeenCalledOnce()
    expect(handler).toHaveBeenCalledWith(mockFiles)
  })

  it('emits upload-start event', () => {
    const core = new UpupCore({ uploadEndpoint: '/test' })
    const handler = vi.fn()

    core.on('upload-start', handler)
    core.emit('upload-start', {})

    expect(handler).toHaveBeenCalledOnce()
  })

  it('emits file-removed event', () => {
    const core = new UpupCore({ uploadEndpoint: '/test' })
    const handler = vi.fn()
    const file = createMockUploadFile('removed.txt', 'id-1')

    core.on('file-removed', handler)
    core.emit('file-removed', file)

    expect(handler).toHaveBeenCalledWith(file)
  })

  it('emits upload-all-complete event', () => {
    const core = new UpupCore({ uploadEndpoint: '/test' })
    const handler = vi.fn()
    const files = [createMockUploadFile('done.txt', 'id-1')]

    core.on('upload-all-complete', handler)
    core.emit('upload-all-complete', files)

    expect(handler).toHaveBeenCalledWith(files)
  })

  it('emits upload-error event', () => {
    const core = new UpupCore({ uploadEndpoint: '/test' })
    const handler = vi.fn()
    const error = new Error('Upload failed')

    core.on('upload-error', handler)
    core.emit('upload-error', { error })

    expect(handler).toHaveBeenCalledWith({ error })
  })

  it('unsubscribes via returned function from on()', () => {
    const core = new UpupCore({ uploadEndpoint: '/test' })
    const handler = vi.fn()

    const unsub = core.on('files-added', handler)
    core.emit('files-added', [])
    expect(handler).toHaveBeenCalledOnce()

    unsub()
    core.emit('files-added', [])
    expect(handler).toHaveBeenCalledOnce() // still 1, not 2
  })
})
