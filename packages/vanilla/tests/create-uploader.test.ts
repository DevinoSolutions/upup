/**
 * create-uploader tests — NOTE: this file is DEFERRED-RED until Task 14.
 * `createUploader` transitively imports ./templates/uploader-panel + ./templates/image-editor-stub
 * which do not exist until Tasks 6–7. All tests fail at import time — expected.
 */
import { describe, it, expect, vi } from 'vitest'
import { createUploader } from '../src/create-uploader'

describe('createUploader', () => {
  it('throws a TypeError when target element is missing', () => {
    expect(() => createUploader('#nope')).toThrow(TypeError)
  })

  it('renders root UI with expected data-testids', () => {
    const div = document.createElement('div')
    document.body.appendChild(div)
    const instance = createUploader(div, {})
    expect(div.querySelector('[data-testid="upup-root"]')).not.toBeNull()
    expect(div.querySelector('.upup-scope')).not.toBeNull()
    expect(div.querySelector('[data-testid="upup-file-input"]')).not.toBeNull()
    instance.destroy()
    document.body.removeChild(div)
  })

  it('destroy() is idempotent, clears DOM, and core.destroy is called once', () => {
    const div = document.createElement('div')
    document.body.appendChild(div)
    const instance = createUploader(div, {})
    const destroySpy = vi.spyOn(instance.core, 'destroy')
    instance.destroy()
    instance.destroy() // second call must be a no-op
    expect(destroySpy).toHaveBeenCalledTimes(1)
    expect(div.children.length).toBe(0)
    document.body.removeChild(div)
  })

  it('subscribe() emits immediately and returns an unsubscribe fn', () => {
    const div = document.createElement('div')
    document.body.appendChild(div)
    const instance = createUploader(div, {})
    const cb = vi.fn()
    const unsub = instance.subscribe(cb)
    expect(cb).toHaveBeenCalledTimes(1)
    unsub()
    instance.destroy()
    document.body.removeChild(div)
  })
})
