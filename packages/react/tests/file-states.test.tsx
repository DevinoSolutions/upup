import { afterEach, describe, it, expect } from 'vitest'
import { cleanup, render, fireEvent, waitFor } from '@testing-library/react'
import React from 'react'
import { UpupUploader } from '../src'

afterEach(() => {
    cleanup()
})

/**
 * Task 6 — adaptive file states (React canon).
 * Files are seeded through the real hidden file input (same idiom as
 * accessibility.test.tsx) so these exercise the live controller + core, not a
 * mocked context.
 */
function renderUploader(
    extra: Partial<React.ComponentProps<typeof UpupUploader>> = {},
) {
    return render(
        <UpupUploader
            provider="aws"
            uploadEndpoint="/api/upload"
            maxFiles={10}
            {...extra}
        />,
    )
}

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

describe('adaptive file layout', () => {
    it('renders the hero for exactly one file (no card items)', async () => {
        const { container } = renderUploader()
        seed(container, [txt('only.txt')])

        await waitFor(() => {
            if (!container.querySelector('[data-testid="upup-file-hero"]'))
                throw new Error('hero not rendered')
        })
        expect(
            container.querySelectorAll('[data-testid="upup-file-item"]').length,
        ).toBe(0)
    })

    it('renders a card list for two files (no hero)', async () => {
        const { container } = renderUploader()
        seed(container, [txt('a.txt'), txt('b.txt')])

        await waitFor(() => {
            const items = container.querySelectorAll(
                '[data-testid="upup-file-item"]',
            )
            if (items.length !== 2) throw new Error('expected 2 file items')
        })
        expect(
            container.querySelector('[data-testid="upup-file-hero"]'),
        ).toBeNull()
    })
})

describe('dual add-more affordances', () => {
    it('renders both header and footer add-more controls when files exist', async () => {
        const { container } = renderUploader()
        seed(container, [txt('a.txt'), txt('b.txt')])

        await waitFor(() => {
            if (
                !container.querySelector(
                    '[data-testid="upup-add-more"][data-placement="footer"]',
                )
            )
                throw new Error('footer add-more not rendered')
        })
        expect(
            container.querySelector(
                '[data-testid="upup-add-more"][data-placement="header"]',
            ),
        ).not.toBeNull()
    })
})

describe('deferred-removal exit animation', () => {
    it('marks a removed card with upup-animate-fx-exit before it unmounts', async () => {
        const { container } = renderUploader()
        seed(container, [txt('a.txt'), txt('b.txt')])

        await waitFor(() => {
            if (
                container.querySelectorAll('[data-testid="upup-file-item"]')
                    .length !== 2
            )
                throw new Error('expected 2 file items')
        })

        // Click the first tile's remove button. jsdom has no matchMedia ⇒ motion
        // 'on' ⇒ the core defers the real removal by the exit window, during
        // which the card renders the collapse class.
        const removeBtn = container.querySelector(
            '[data-testid="upup-file-remove"]',
        ) as HTMLButtonElement
        fireEvent.click(removeBtn)

        const leaving = container.querySelector(
            '[data-testid="upup-file-item"].upup-animate-fx-exit',
        )
        expect(leaving).not.toBeNull()

        // After the exit window the real removal fires; one file remains, which
        // the adaptive layout now renders as the hero (no card items left).
        await waitFor(() => {
            if (
                container.querySelectorAll('[data-testid="upup-file-item"]')
                    .length !== 0
            )
                throw new Error('card not yet removed')
            if (!container.querySelector('[data-testid="upup-file-hero"]'))
                throw new Error('remaining file not yet promoted to hero')
        })
    })
})
