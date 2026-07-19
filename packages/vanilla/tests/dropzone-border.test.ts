import { describe, it, expect, beforeEach, vi } from 'vitest'
import { createUploader } from '../src/create-uploader'

// Regression coverage for the cached-snapshot dropzone border at the vanilla seam.
// The shared core DragDropController caches getSnapshot() and only recomputes on
// drag events or an orchestrator notify. Vanilla removes files through core directly
// (core.removeFile / core.removeAll), which emits no orchestrator notify — so the
// public removeFile()/removeAll() handlers MUST nudge dragDrop.recompute() or the
// empty-state border (absoluteHasBorder) stays absent after the list is emptied.

beforeEach(() => {
    document.body.innerHTML = ''
})

function fileOf(name: string, type = 'text/plain') {
    return new File([new Uint8Array([1, 2, 3])], name, { type })
}

describe('vanilla dropzone border recovery', () => {
    function setup() {
        const host = document.createElement('div')
        document.body.appendChild(host)
        const up = createUploader(host, { sources: ['local'], maxFiles: 5 })
        const hasBorder = () => {
            // Redesign (Task 10): the empty idle dropzone shows the animated
            // dashed SVG frame (data-upup-slot="dropzone-frame") in place of the
            // old CSS `upup-border`. showDropzoneFrame is driven by the same
            // absoluteHasBorder the recompute-nudge contract guards, so the
            // frame's presence/absence tracks the border affordance exactly as
            // the CSS class did before.
            return !!host.querySelector('[data-upup-slot="dropzone-frame"]')
        }
        return { up, hasBorder }
    }

    it('restores the empty-state border after removing the last file via removeFile()', async () => {
        const { up, hasBorder } = setup()
        expect(hasBorder()).toBe(true) // empty → border
        await up.addFiles([fileOf('a.txt')])
        await Promise.resolve()
        expect(hasBorder()).toBe(false) // file present → no border
        up.removeFile(up.getState().files[0]!.id)
        // Deferred-removal contract (core transient-ui-state, commit 34362f92):
        // the file leaves only after the ~200ms exit window, so the empty-state
        // border returns once true removal fires (jsdom has no matchMedia ⇒
        // motion 'on'). Task 10 will render upup-fx-exit during it.
        await vi.waitFor(() => expect(hasBorder()).toBe(true)) // last file gone → border returns
        up.destroy()
    })

    it('restores the empty-state border after removeAll()', async () => {
        const { up, hasBorder } = setup()
        await up.addFiles([fileOf('a.txt'), fileOf('b.txt')])
        await Promise.resolve()
        expect(hasBorder()).toBe(false) // files present → no border
        up.removeAll()
        await Promise.resolve()
        expect(hasBorder()).toBe(true) // all gone → border returns
        up.destroy()
    })
})
