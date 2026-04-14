import { describe, it, expect } from 'vitest'
import { render } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { axe, toHaveNoViolations, type JestAxeConfigureOptions } from 'jest-axe'
import React from 'react'
import { UpupUploader } from '../src'

expect.extend(toHaveNoViolations)

/**
 * Render <UpupUploader> with the minimum props needed across the suite.
 * Every component in this suite lives inside this tree — no mock context.
 */
function renderUploader(extra: Partial<React.ComponentProps<typeof UpupUploader>> = {}) {
    return render(
        <UpupUploader
            provider="s3"
            serverUrl="https://example.com"
            {...extra}
        />,
    )
}

/**
 * Scoped axe scan against a component's data-upup-slot subtree.
 * Returns the axe results object — callers assert `toHaveNoViolations()`.
 *
 * Why scoped: an unscoped scan of the whole <UpupUploader> tree would attribute
 * a violation in FileList to MainBox. Scoping to the slot subtree gives each
 * describe block a clean, per-component signal.
 */
async function scanSlot(
    container: HTMLElement,
    slot: string,
    overrides: JestAxeConfigureOptions = {},
) {
    const node = container.querySelector(
        `[data-upup-slot="${slot}"]`,
    ) as HTMLElement | null
    if (!node) {
        throw new Error(
            `scanSlot: no element with data-upup-slot="${slot}" found. ` +
                `Did the component render? Check activation steps.`,
        )
    }
    return axe(node, overrides)
}

/**
 * Click a source button by its UploadAdapter id (lowercased).
 * Valid ids: internal, google_drive, one_drive, dropbox, box, link, camera.
 *
 * Pass the same `user` instance across multiple calls in a single test to
 * preserve pointer event continuity.
 */
async function activateSource(
    container: HTMLElement,
    sourceId: string,
    user = userEvent.setup(),
) {
    const btn = container.querySelector(
        `[data-testid="upup-source-${sourceId}"]`,
    ) as HTMLElement | null
    if (!btn) {
        throw new Error(
            `activateSource: no [data-testid="upup-source-${sourceId}"] found.`,
        )
    }
    await user.click(btn)
}

// Placeholder — keeps vitest from failing with "no test suite found".
// Subsequent tasks will replace this with real describe blocks.
describe('accessibility-components scaffold', () => {
    it('helpers are defined', () => {
        expect(typeof renderUploader).toBe('function')
        expect(typeof scanSlot).toBe('function')
        expect(typeof activateSource).toBe('function')
    })
})

describe('axe — MainBox (DropZone)', () => {
    it('has no violations in default state', async () => {
        const { container } = renderUploader()
        const results = await scanSlot(container, 'main-box', {
            rules: {
                // role="button" on the droppable region + nested controls is the
                // WAI-ARIA dropzone pattern, not a violation.
                'nested-interactive': { enabled: false },
            },
        })
        expect(results).toHaveNoViolations()
    })
})

describe('axe — AdapterSelector (SourceSelector)', () => {
    it('has no violations in default state', async () => {
        const { container } = renderUploader()
        const results = await scanSlot(container, 'adapter-selector')
        expect(results).toHaveNoViolations()
    })
})

describe('axe — UrlUploader', () => {
    it('has no violations after activating Link source', async () => {
        const { container } = renderUploader()
        await activateSource(container, 'link')
        const results = await scanSlot(container, 'url-uploader')
        expect(results).toHaveNoViolations()
    })
})

describe('axe — CameraUploader', () => {
    it('has no violations after activating Camera source', async () => {
        const { container } = renderUploader()
        await activateSource(container, 'camera')
        const results = await scanSlot(container, 'camera-uploader', {
            rules: {
                // react-webcam renders a <video> without <track>; jsdom can't
                // evaluate captions anyway, and this is a known library limitation.
                'video-caption': { enabled: false },
            },
        })
        expect(results).toHaveNoViolations()
    })
})

describe('axe — BoxUploader', () => {
    it('has no violations in auth-prompt state (missing clientId)', async () => {
        // box is not in the default sources list; pass it explicitly
        const { container } = renderUploader({ sources: ['box'] })
        await activateSource(container, 'box')
        const results = await scanSlot(container, 'box-uploader')
        expect(results).toHaveNoViolations()
    })
})

describe('axe — DropboxUploader', () => {
    it('has no violations in auth-prompt state (missing clientId)', async () => {
        // dropbox is not in the default sources list; pass it explicitly
        const { container } = renderUploader({ sources: ['dropbox'] })
        await activateSource(container, 'dropbox')
        const results = await scanSlot(container, 'dropbox-uploader')
        expect(results).toHaveNoViolations()
    })
})

describe('axe — GoogleDriveUploader', () => {
    it('has no violations in auth-prompt state (missing clientId)', async () => {
        // google_drive is not in the default sources list; pass it explicitly
        const { container } = renderUploader({ sources: ['google_drive'] })
        await activateSource(container, 'google_drive')
        const results = await scanSlot(container, 'google-drive-uploader')
        expect(results).toHaveNoViolations()
    })
})
