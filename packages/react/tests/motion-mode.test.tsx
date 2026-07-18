import { afterEach, describe, it, expect } from 'vitest'
import { cleanup, fireEvent, render, waitFor } from '@testing-library/react'
import React from 'react'
import { UpupUploader } from '../src'

afterEach(() => {
    cleanup()
})

/**
 * The motion gate resolves the ONE `data-motion` value written onto the
 * uploader-panel element; the shared CSS gates every `upup-fx-*` rule on it.
 * Default is `on`; `animations={false}` forces `off` (reduced-motion is covered
 * by the core motion-gate unit suite — jsdom has no matchMedia here).
 */
describe('data-motion gate on the uploader panel', () => {
    it('defaults to on', async () => {
        const { container } = render(
            <UpupUploader provider="aws" uploadEndpoint="/api/upload" />,
        )
        await waitFor(() => {
            const panel = container.querySelector(
                '[data-upup-slot="uploader-panel"]',
            )
            expect(panel?.getAttribute('data-motion')).toBe('on')
        })
    })

    it('is off when animations={false}', async () => {
        const { container } = render(
            <UpupUploader
                provider="aws"
                uploadEndpoint="/api/upload"
                animations={false}
            />,
        )
        await waitFor(() => {
            const panel = container.querySelector(
                '[data-upup-slot="uploader-panel"]',
            )
            expect(panel?.getAttribute('data-motion')).toBe('off')
        })
        // The march class is DRAG-STATE-driven (dots rest at idle, march only
        // while a drag is over the panel) and is never JS-motion-gated: it
        // appears on drag even under animations={false} — the shared
        // `[data-motion='off']` CSS kill rule is what makes it static.
        const rect = () =>
            container.querySelector('[data-upup-slot="dropzone-frame"] rect')
        expect(rect()?.getAttribute('class') ?? '').not.toContain(
            'upup-animate-fx-dash-march',
        )
        const panel = container.querySelector(
            '[data-upup-slot="uploader-panel"]',
        ) as HTMLElement
        const dataTransfer = { types: ['Files'], items: [], files: [] }
        fireEvent.dragEnter(panel, { dataTransfer })
        fireEvent.dragOver(panel, { dataTransfer })
        await waitFor(() => {
            expect(rect()?.getAttribute('class') ?? '').toContain(
                'upup-animate-fx-dash-march',
            )
        })
    })
})
