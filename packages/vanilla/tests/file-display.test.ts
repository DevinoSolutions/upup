import { describe, it, expect, beforeEach, vi } from 'vitest'
import { createUploader } from '../src/create-uploader'

beforeEach(() => {
    document.body.innerHTML = ''
})

function fileOf(name: string, type = 'text/plain') {
    return new File([new Uint8Array([1, 2, 3])], name, { type })
}

describe('file display', () => {
    it('renders a file row after addFiles and removes it after removeFile', async () => {
        const host = document.createElement('div')
        document.body.appendChild(host)
        const up = createUploader(host, { sources: ['local'], maxFiles: 5 })
        await up.addFiles([fileOf('a.txt')])
        await Promise.resolve()
        expect(
            host.querySelector('[data-testid="upup-file-item"]'),
        ).toBeTruthy()
        const id = up.getState().files[0]!.id
        up.removeFile(id)
        // Deferred-removal contract (core transient-ui-state, commit 34362f92):
        // the row stays mounted through the ~200ms exit window before true
        // removal (jsdom has no matchMedia ⇒ motion 'on'). Task 10 will render
        // upup-fx-exit during it.
        await Promise.resolve()
        expect(
            host.querySelector('[data-testid="upup-file-item"]'),
        ).toBeTruthy()
        await vi.waitFor(() =>
            expect(
                host.querySelector('[data-testid="upup-file-item"]'),
            ).toBeNull(),
        )
        up.destroy()
    })
})
