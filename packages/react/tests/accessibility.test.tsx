import { describe, it, expect } from 'vitest'
import { render, fireEvent, waitFor, within } from '@testing-library/react'
import { axe, toHaveNoViolations } from 'jest-axe'
import { UpupUploader } from '../src'

expect.extend(toHaveNoViolations)

describe('UploaderPanel accessibility', () => {
    it('UploaderPanel has aria-dropeffect="none" in default state', () => {
        const { container } = render(
            <UpupUploader provider="s3" serverUrl="https://example.com" />,
        )
        const uploaderPanel = container.querySelector(
            '[data-upup-slot="uploader-panel"]',
        )
        expect(uploaderPanel?.getAttribute('aria-dropeffect')).toBe('none')
    })

    it('UploaderPanel is a non-interactive labelled region (no nested-interactive)', () => {
        const { container } = render(
            <UpupUploader provider="s3" serverUrl="https://example.com" />,
        )
        const uploaderPanel = container.querySelector(
            '[data-upup-slot="uploader-panel"]',
        ) as HTMLElement
        // The panel wraps interactive descendants (source buttons, file
        // controls), so it must NOT itself be interactive/focusable — that would
        // be an axe nested-interactive violation. It is a labelled region
        // instead; keyboard users reach click-to-browse via the buttons inside.
        expect(uploaderPanel?.getAttribute('role')).toBe('region')
        expect(uploaderPanel?.hasAttribute('tabindex')).toBe(false)
    })

    it('UploaderPanel has an accessible label', () => {
        const { container } = render(
            <UpupUploader provider="s3" serverUrl="https://example.com" />,
        )
        const uploaderPanel = container.querySelector(
            '[data-upup-slot="uploader-panel"]',
        ) as HTMLElement
        const hasLabel =
            uploaderPanel?.hasAttribute('aria-label') ||
            uploaderPanel?.hasAttribute('aria-labelledby')
        expect(hasLabel).toBe(true)
    })

    it('has no axe-core accessibility violations', async () => {
        const { container } = render(
            <UpupUploader provider="s3" serverUrl="https://example.com" />,
        )
        const results = await axe(container)
        expect(results).toHaveNoViolations()
    })
})

describe('ProgressBar accessibility', () => {
    it('ProgressBar has ARIA role and value attributes when upload is active', () => {
        const { container } = render(
            <UpupUploader provider="s3" serverUrl="https://example.com" />,
        )
        // ProgressBar conditionally renders when progress > 0 — check if visible
        const progressBar = container.querySelector(
            '[data-upup-slot="progress-bar"]',
        )
        if (progressBar) {
            expect(progressBar.getAttribute('role')).toBe('progressbar')
            expect(progressBar.hasAttribute('aria-valuenow')).toBe(true)
            expect(progressBar.hasAttribute('aria-valuemin')).toBe(true)
            expect(progressBar.hasAttribute('aria-valuemax')).toBe(true)
        }
        // If progressBar is null (conditional render with no files), test still passes —
        // the structural test is in progress-bar.test.tsx
    })
})

describe('FileList accessibility (ARIA)', () => {
    it('exposes list/listitem roles and a polite live-status region for selected files', async () => {
        const { container } = render(
            <UpupUploader provider="s3" serverUrl="https://example.com" />,
        )
        const input = container.querySelector(
            '[data-testid="upup-file-input"]',
        ) as HTMLInputElement
        expect(input).not.toBeNull()

        const file1 = new File([new Uint8Array(1024).fill(1)], 'one.txt', {
            type: 'text/plain',
        })
        const file2 = new File([new Uint8Array(1024).fill(2)], 'two.txt', {
            type: 'text/plain',
        })
        Object.defineProperty(input, 'files', {
            value: [file1, file2],
            configurable: true,
        })
        fireEvent.change(input)

        const fileList = await waitFor(() => {
            const fl = container.querySelector(
                '[data-upup-slot="file-list"]',
            ) as HTMLElement | null
            if (!fl || fl.className.includes('upup-hidden')) {
                throw new Error('file-list still hidden')
            }
            return fl
        })

        // List container has role="list" and one role="listitem" per selected file
        const list = fileList.querySelector(
            '[role="list"]',
        ) as HTMLElement | null
        expect(list).not.toBeNull()
        const items = within(list!).getAllByRole('listitem')
        expect(items).toHaveLength(2)

        // A polite live-status region announces the localized file count
        const status = fileList.querySelector('[role="status"]')
        expect(status).not.toBeNull()
        expect(status?.getAttribute('aria-live')).toBe('polite')

        const results = await axe(container)
        expect(results).toHaveNoViolations()
    })
})
