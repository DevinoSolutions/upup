import { describe, it, expect, beforeEach, vi } from 'vitest'
import { createUploader } from '../src/create-uploader'

beforeEach(() => {
    document.body.innerHTML = ''
})

function fileOf(name: string, type = 'text/plain') {
    return new File([new Uint8Array([1, 2, 3])], name, { type })
}

describe('file display', () => {
    it('renders a file after addFiles and removes it after removeFile', async () => {
        const host = document.createElement('div')
        document.body.appendChild(host)
        const up = createUploader(host, { sources: ['local'], maxFiles: 5 })
        // Redesign (Task 10): a single file renders the FileHero
        // (data-testid="upup-file-hero"), not a card/list file-item — that
        // branch is only reached at 2+ files.
        await up.addFiles([fileOf('a.txt')])
        await Promise.resolve()
        expect(
            host.querySelector('[data-testid="upup-file-hero"]'),
        ).toBeTruthy()
        const id = up.getState().files[0]!.id
        up.removeFile(id)
        // Deferred-removal contract (core transient-ui-state, commit 34362f92):
        // the hero stays mounted through the ~200ms exit window before true
        // removal (jsdom has no matchMedia ⇒ motion 'on'); it renders
        // upup-fx-exit during it.
        await Promise.resolve()
        expect(
            host.querySelector('[data-testid="upup-file-hero"]'),
        ).toBeTruthy()
        await vi.waitFor(() =>
            expect(
                host.querySelector('[data-testid="upup-file-hero"]'),
            ).toBeNull(),
        )
        up.destroy()
    })
})
