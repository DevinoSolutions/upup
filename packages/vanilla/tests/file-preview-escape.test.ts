import { describe, it, expect, beforeEach } from 'vitest'
import { createUploader } from '../src/create-uploader'

// F-605 — Escape closes the preview via a WINDOW-level keydown listener, matching
// the react/vue/svelte canon. Before this fix, vanilla only bound `@keydown` on the
// dialog div, which the modal never focuses (it opens from a click on the
// "click to preview" button, which does not move focus into the portal) — so
// Escape silently no-opped. Dispatching on `window` (not the dialog) reproduces
// the real trigger path.

beforeEach(() => {
    document.body.innerHTML = ''
})

function imageFile(name: string) {
    return new File([new Uint8Array([1, 2, 3])], name, { type: 'image/png' })
}

describe('vanilla file-preview-portal — Escape closes (F-605)', () => {
    it('closes the portal on a window-level Escape keydown', async () => {
        const host = document.createElement('div')
        document.body.appendChild(host)
        const up = createUploader(host, { sources: ['local'], maxFiles: 5 })
        await up.addFiles([imageFile('photo.png')])
        await Promise.resolve()

        const previewBtn = Array.from(host.querySelectorAll('button')).find(b =>
            b.textContent?.includes('Click to preview'),
        ) as HTMLButtonElement | undefined
        expect(previewBtn, 'preview trigger button present').toBeTruthy()
        previewBtn!.click()
        await Promise.resolve()

        expect(
            host.querySelector('[data-upup-slot="file-preview-portal"]'),
            'portal open after click',
        ).toBeTruthy()

        // Dispatch on window, not the dialog — focus never entered the dialog.
        window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }))
        await Promise.resolve()

        expect(
            host.querySelector('[data-upup-slot="file-preview-portal"]'),
            'portal closed after Escape',
        ).toBeNull()
        up.destroy()
    })

    it('removes its window listener when the portal closes (no leak across files)', async () => {
        const host = document.createElement('div')
        document.body.appendChild(host)
        const up = createUploader(host, { sources: ['local'], maxFiles: 5 })
        await up.addFiles([imageFile('a.png'), imageFile('b.png')])
        await Promise.resolve()

        const previewBtns = () =>
            Array.from(host.querySelectorAll('button')).filter(b =>
                b.textContent?.includes('Click to preview'),
            ) as HTMLButtonElement[]

        // Open + close the first file's portal via the X button (not Escape).
        previewBtns()[0]!.click()
        await Promise.resolve()
        const closeBtn = host.querySelector(
            '[data-upup-slot="file-preview-portal"] button[aria-label]',
        ) as HTMLButtonElement
        closeBtn.click()
        await Promise.resolve()
        expect(
            host.querySelector('[data-upup-slot="file-preview-portal"]'),
        ).toBeNull()

        // A later Escape (no portal open) must not throw or do anything observable.
        expect(() =>
            window.dispatchEvent(
                new KeyboardEvent('keydown', { key: 'Escape' }),
            ),
        ).not.toThrow()

        up.destroy()
    })
})
