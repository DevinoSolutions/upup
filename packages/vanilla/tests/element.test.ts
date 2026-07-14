import { describe, it, expect, beforeEach, vi } from 'vitest'
import { UpupUploaderElement } from '../src/element' // importing the module defines <upup-uploader>

beforeEach(() => {
    document.body.innerHTML = ''
})

describe('<upup-uploader> custom element', () => {
    it('mounts the uploader on connect and tears down on disconnect', async () => {
        const el = document.createElement(
            'upup-uploader',
        ) as UpupUploaderElement
        el.config = { sources: ['local'] }
        document.body.appendChild(el)
        await Promise.resolve()
        expect(el.querySelector('[data-testid="upup-root"]')).toBeTruthy()
        el.remove()
        await Promise.resolve()
        expect(el.querySelector('[data-testid="upup-root"]')).toBeNull()
    })

    it('forwards core upload-all-complete as a upup:upload-complete CustomEvent', async () => {
        const el = document.createElement(
            'upup-uploader',
        ) as UpupUploaderElement
        el.config = { sources: ['local'] }
        document.body.appendChild(el)
        await Promise.resolve()
        const handler = vi.fn()
        el.addEventListener('upup:upload-complete', handler)
        el.instance!.core.emit('upload-all-complete', [])
        expect(handler).toHaveBeenCalled()
        el.remove()
    })

    it('registers the element exactly once with our constructor (idempotent import)', () => {
        expect(customElements.get('upup-uploader')).toBe(UpupUploaderElement)
    })
})
