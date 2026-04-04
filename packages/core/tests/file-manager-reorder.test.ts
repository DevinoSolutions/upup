import { describe, it, expect, beforeEach } from 'vitest'
import { FileManager } from '../src/file-manager'

describe('FileManager.reorderFiles', () => {
  let fm: FileManager

  beforeEach(() => {
    fm = new FileManager({})
  })

  it('should reorder files by array of IDs', async () => {
    const f1 = new File(['a'], 'a.txt', { type: 'text/plain' })
    const f2 = new File(['b'], 'b.txt', { type: 'text/plain' })
    const f3 = new File(['c'], 'c.txt', { type: 'text/plain' })
    const added = await fm.addFiles([f1, f2, f3])
    const ids = added.map(f => f.id)

    // Reverse order
    fm.reorderFiles([ids[2], ids[0], ids[1]])

    const reordered = [...fm.getFiles().values()]
    expect(reordered[0].id).toBe(ids[2])
    expect(reordered[1].id).toBe(ids[0])
    expect(reordered[2].id).toBe(ids[1])
  })

  it('should throw if fileIds array length does not match files count', async () => {
    const f1 = new File(['a'], 'a.txt', { type: 'text/plain' })
    await fm.addFiles([f1])

    expect(() => fm.reorderFiles([])).toThrow()
  })

  it('should throw if fileIds contain unknown IDs', async () => {
    const f1 = new File(['a'], 'a.txt', { type: 'text/plain' })
    await fm.addFiles([f1])

    expect(() => fm.reorderFiles(['unknown-id'])).toThrow()
  })

  it('should be a no-op when order is the same', async () => {
    const f1 = new File(['a'], 'a.txt', { type: 'text/plain' })
    const f2 = new File(['b'], 'b.txt', { type: 'text/plain' })
    const added = await fm.addFiles([f1, f2])
    const ids = added.map(f => f.id)

    fm.reorderFiles(ids)

    const files = [...fm.getFiles().values()]
    expect(files[0].id).toBe(ids[0])
    expect(files[1].id).toBe(ids[1])
  })
})
