import { describe, it, expect, vi } from 'vitest'
import { FileManager } from '../src/file-manager'
import type { UploadFile } from '@upup/shared'

const makeNativeFile = (name = 'test.jpg', size = 1024, type = 'image/jpeg'): File => {
  return new File(['x'.repeat(size)], name, { type })
}

describe('FileManager', () => {
  it('adds files and generates IDs', async () => {
    const fm = new FileManager({})
    const result = await fm.addFiles([makeNativeFile('a.jpg'), makeNativeFile('b.png')])
    expect(result).toHaveLength(2)
    expect(result[0].name).toBe('a.jpg')
    expect(result[1].name).toBe('b.png')
    expect(result[0].id).toBeDefined()
    expect(result[0].id).not.toBe(result[1].id)
  })

  it('enforces file limit', async () => {
    const fm = new FileManager({ limit: 2 })
    await fm.addFiles([makeNativeFile('a.jpg')])
    await expect(fm.addFiles([makeNativeFile('b.jpg'), makeNativeFile('c.jpg')])).rejects.toThrow()
  })

  it('enforces accept filter', async () => {
    const fm = new FileManager({ accept: 'image/*' })
    await expect(fm.addFiles([makeNativeFile('doc.pdf', 100, 'application/pdf')])).rejects.toThrow()
  })

  it('enforces maxFileSize', async () => {
    const fm = new FileManager({ maxFileSize: { size: 500, unit: 'B' } })
    await expect(fm.addFiles([makeNativeFile('big.jpg', 1024)])).rejects.toThrow()
  })

  it('calls async onBeforeFileAdded and rejects on false', async () => {
    const fm = new FileManager({ onBeforeFileAdded: async () => false })
    const result = await fm.addFiles([makeNativeFile()])
    expect(result).toHaveLength(0)
  })

  it('calls async onBeforeFileAdded and accepts on true', async () => {
    const fm = new FileManager({ onBeforeFileAdded: async () => true })
    const result = await fm.addFiles([makeNativeFile()])
    expect(result).toHaveLength(1)
  })

  it('removes a file by ID', async () => {
    const fm = new FileManager({})
    const [file] = await fm.addFiles([makeNativeFile()])
    fm.removeFile(file.id)
    expect(fm.getFiles().size).toBe(0)
  })

  it('removes all files', async () => {
    const fm = new FileManager({})
    await fm.addFiles([makeNativeFile('a.jpg'), makeNativeFile('b.jpg')])
    fm.removeAll()
    expect(fm.getFiles().size).toBe(0)
  })

  it('reorders files', async () => {
    const fm = new FileManager({})
    const files = await fm.addFiles([makeNativeFile('a.jpg'), makeNativeFile('b.jpg'), makeNativeFile('c.jpg')])
    fm.reorderFiles(0, 2)
    const ordered = [...fm.getFiles().values()]
    expect(ordered[0].name).toBe('b.jpg')
    expect(ordered[2].name).toBe('a.jpg')
  })

  it('replaces all files with setFiles', async () => {
    const fm = new FileManager({})
    await fm.addFiles([makeNativeFile('old.jpg')])
    await fm.setFiles([makeNativeFile('new.jpg')])
    const files = [...fm.getFiles().values()]
    expect(files).toHaveLength(1)
    expect(files[0].name).toBe('new.jpg')
  })
})
