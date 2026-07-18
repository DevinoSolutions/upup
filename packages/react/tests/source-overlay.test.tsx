import { afterEach, describe, it, expect } from 'vitest'
import { cleanup, render, fireEvent, waitFor } from '@testing-library/react'
import React from 'react'
import { UpupUploader } from '../src'

afterEach(() => {
    cleanup()
})

/**
 * Task 7 — add-more source overlay (React canon).
 * Files are seeded through the real hidden file input so these exercise the
 * live controller + core transient-UI store, not a mocked context.
 */
function renderUploader() {
    return render(
        <UpupUploader
            provider="aws"
            uploadEndpoint="/api/upload"
            maxFiles={10}
        />,
    )
}

/** Seed files through whichever file input is currently mounted (idle selector
 *  or the overlay's selector). */
function seed(container: HTMLElement, files: File[]) {
    const input = container.querySelector(
        '[data-testid="upup-file-input"]',
    ) as HTMLInputElement
    expect(input).not.toBeNull()
    Object.defineProperty(input, 'files', { value: files, configurable: true })
    fireEvent.change(input)
}

function txt(name: string) {
    return new File([new Uint8Array(1024).fill(1)], name, {
        type: 'text/plain',
    })
}

async function seedAndWaitForList(container: HTMLElement, files: File[]) {
    seed(container, files)
    await waitFor(() => {
        if (!container.querySelector('[data-testid="upup-file-list"]'))
            throw new Error('file list not rendered')
    })
}

function overlay(container: HTMLElement) {
    return container.querySelector('[data-upup-slot="source-overlay"]')
}

function headerTrigger(container: HTMLElement) {
    return container.querySelector(
        '[data-testid="upup-add-more"][data-placement="header"]',
    ) as HTMLButtonElement
}

function openViaHeader(container: HTMLElement) {
    const btn = headerTrigger(container)
    expect(btn).not.toBeNull()
    // Focus the trigger first so focus-restore-on-close has a deterministic target.
    btn.focus()
    fireEvent.click(btn)
}

describe('add-more source overlay', () => {
    it('opens the overlay over a still-mounted, dimmed file list', async () => {
        const { container } = renderUploader()
        await seedAndWaitForList(container, [txt('a.txt'), txt('b.txt')])

        expect(overlay(container)).toBeNull()
        openViaHeader(container)

        await waitFor(() => {
            if (!overlay(container)) throw new Error('overlay not rendered')
        })
        // Source selector lives inside the overlay:
        expect(
            container.querySelector(
                '[data-upup-slot="source-overlay"] [data-testid="upup-source-selector"]',
            ),
        ).not.toBeNull()
        // The overlay is a labelled modal dialog:
        const dialog = overlay(container) as HTMLElement
        expect(dialog.getAttribute('role')).toBe('dialog')
        expect(dialog.getAttribute('aria-modal')).toBe('true')
        expect(dialog.getAttribute('aria-label')).toBe('Adding more files')
        // The file list stays mounted underneath, dimmed AND inert (so keyboard
        // and screen readers can't reach the hidden controls behind the overlay):
        const list = container.querySelector(
            '[data-testid="upup-file-list"]',
        ) as HTMLElement
        expect(list).not.toBeNull()
        // Mock st2-listdim: dimmed AND softly blurred, but still visible.
        expect(list.className).toContain('upup-opacity-50')
        expect(list.className).toContain('upup-blur-[2px]')
        expect(list.className).toContain('upup-pointer-events-none')
        expect(list.hasAttribute('inert')).toBe(true)
        // Focus moved into the overlay on open:
        expect(dialog.contains(document.activeElement)).toBe(true)
    })

    it('closes the overlay when files are added while it is open', async () => {
        const { container } = renderUploader()
        await seedAndWaitForList(container, [txt('a.txt'), txt('b.txt')])
        openViaHeader(container)
        await waitFor(() => {
            if (!overlay(container)) throw new Error('overlay not rendered')
        })

        // Add a third file through the overlay's own picker input.
        seed(container, [txt('c.txt')])

        await waitFor(() => {
            if (overlay(container))
                throw new Error('overlay should have closed on add')
        })
        // Landed on the merged 3-file list, un-dimmed.
        await waitFor(() => {
            const items = container.querySelectorAll(
                '[data-testid="upup-file-item"]',
            )
            if (items.length !== 3) throw new Error('expected 3 files merged')
        })
        const list = container.querySelector(
            '[data-testid="upup-file-list"]',
        ) as HTMLElement
        expect(list.className).not.toContain('upup-opacity-50')
    })

    it('closes on the overlay Back control and re-opens cleanly', async () => {
        const { container } = renderUploader()
        await seedAndWaitForList(container, [txt('a.txt'), txt('b.txt')])

        openViaHeader(container)
        await waitFor(() => {
            if (!overlay(container)) throw new Error('overlay not rendered')
        })

        // The sheet grip is the close control; its aria-label carries the
        // Back semantics for AT (the old header Back row is gone — the sheet
        // chrome replaced it).
        const grip = container.querySelector(
            '[data-testid="upup-sheet-grip"]',
        ) as HTMLButtonElement
        expect(grip).not.toBeNull()
        expect(grip.getAttribute('aria-label')).toMatch(/back/i)
        fireEvent.click(grip)

        // Two-phase close: the overlay stays mounted and plays the reverse slide
        // (state-driven, no animationend listener) before it unmounts. While
        // departing it drops its modality — no live pointer events, no dialog
        // role/aria-modal — so AT/pointer don't see two live surfaces at once.
        const closing = overlay(container) as HTMLElement
        expect(closing).not.toBeNull()
        expect(closing.className).toContain('upup-fx-overlay-close-slide')
        expect(closing.className).toContain('upup-pointer-events-none')
        expect(closing.getAttribute('aria-modal')).toBeNull()
        expect(closing.getAttribute('role')).toBeNull()

        await waitFor(() => {
            if (overlay(container))
                throw new Error('overlay should have closed')
        })
        const list = container.querySelector(
            '[data-testid="upup-file-list"]',
        ) as HTMLElement
        expect(list.className).not.toContain('upup-opacity-50')
        // Focus returns to the add-more trigger once the close settles.
        expect(document.activeElement).toBe(headerTrigger(container))

        // Re-open works after a close — no state was torn down.
        openViaHeader(container)
        await waitFor(() => {
            if (!overlay(container)) throw new Error('overlay did not re-open')
        })
    })

    it('is idempotent: opening twice keeps a single overlay', async () => {
        const { container } = renderUploader()
        await seedAndWaitForList(container, [txt('a.txt'), txt('b.txt')])

        openViaHeader(container)
        await waitFor(() => {
            if (!overlay(container)) throw new Error('overlay not rendered')
        })
        // The header add-more still exists in the dimmed list; clicking it again
        // must not spawn a second overlay (open command is idempotent).
        openViaHeader(container)
        expect(
            container.querySelectorAll('[data-upup-slot="source-overlay"]')
                .length,
        ).toBe(1)
    })
})
