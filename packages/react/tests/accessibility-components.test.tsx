import { afterEach, describe, it, expect } from 'vitest'
import { cleanup, render, fireEvent, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { axe, toHaveNoViolations, type JestAxeConfigureOptions } from 'jest-axe'
import React from 'react'
import { UpupUploader } from '../src'

expect.extend(toHaveNoViolations)

afterEach(() => {
    cleanup()
})

/**
 * Render <UpupUploader> with the minimum props needed across the suite.
 * Every component in this suite lives inside this tree — no mock context.
 */
function renderUploader(
    extra: Partial<React.ComponentProps<typeof UpupUploader>> = {},
) {
    return render(
        <UpupUploader provider="aws" uploadEndpoint="/api/upload" {...extra} />,
    )
}

/**
 * Scoped axe scan against a component's data-upup-slot subtree.
 * Returns the axe results object — callers assert `toHaveNoViolations()`.
 *
 * Why scoped: an unscoped scan of the whole <UpupUploader> tree would attribute
 * a violation in FileList to UploaderPanel. Scoping to the slot subtree gives each
 * describe block a clean, per-component signal.
 */
async function scanSlot(
    container: HTMLElement,
    slot: string,
    overrides: JestAxeConfigureOptions = {},
) {
    let node: HTMLElement | null = null
    await waitFor(
        () => {
            node = container.querySelector(
                `[data-upup-slot="${slot}"]`,
            ) as HTMLElement | null
            if (!node) {
                throw new Error(
                    `scanSlot: no element with data-upup-slot="${slot}" found. ` +
                        `Did the component render? Check activation steps.`,
                )
            }
        },
        { timeout: 5000 },
    )
    return axe(node, overrides)
}

/**
 * Click a source button by canonical source id.
 * Valid ids: local, googleDrive, oneDrive, dropbox, box, url, camera.
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

/**
 * Stub file selection on an <input type="file">. `userEvent.upload()` does not
 * trigger React's onChange in jsdom — fireEvent.change does, provided that the
 * `files` property is first stubbed onto the element.
 */
function stubFileInput(input: HTMLInputElement, files: File[]) {
    Object.defineProperty(input, 'files', {
        value: files,
        configurable: true,
    })
    fireEvent.change(input)
}

describe('axe — UploaderPanel (DropZone)', () => {
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

describe('axe — SourceSelector (SourceSelector)', () => {
    it('has no violations in default state', async () => {
        const { container } = renderUploader()
        const results = await scanSlot(container, 'source-selector')
        expect(results).toHaveNoViolations()
    })
})

describe('axe — UrlUploader', () => {
    it('has no violations after activating Link source', async () => {
        const { container } = renderUploader()
        await activateSource(container, 'url')
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
    // Coverage note: this test scopes to the DriveAuthFallback state. The
    // authenticated picker state requires a live OAuth flow and is not covered
    // by this suite.
    it('has no violations in auth-prompt state (missing clientId)', async () => {
        // box is not in the default sources list; pass it explicitly
        const { container } = renderUploader({ sources: ['box'] })
        await activateSource(container, 'box')
        const results = await scanSlot(container, 'box-uploader')
        expect(results).toHaveNoViolations()
    })
})

describe('axe — DropboxUploader', () => {
    // Coverage note: this test scopes to the DriveAuthFallback state. The
    // authenticated picker state requires a live OAuth flow and is not covered
    // by this suite.
    it('has no violations in auth-prompt state (missing clientId)', async () => {
        // dropbox is not in the default sources list; pass it explicitly
        const { container } = renderUploader({ sources: ['dropbox'] })
        await activateSource(container, 'dropbox')
        const results = await scanSlot(container, 'dropbox-uploader')
        expect(results).toHaveNoViolations()
    })
})

describe('axe — GoogleDriveUploader', () => {
    // Coverage note: this test scopes to the DriveAuthFallback state. The
    // authenticated picker state requires a live OAuth flow and is not covered
    // by this suite.
    it('has no violations in auth-prompt state (missing clientId)', async () => {
        // googleDrive is not in the default sources list; pass it explicitly
        const { container } = renderUploader({ sources: ['googleDrive'] })
        await activateSource(container, 'googleDrive')
        const results = await scanSlot(container, 'google-drive-uploader')
        expect(results).toHaveNoViolations()
    })
})

describe('axe — OneDriveUploader', () => {
    // Coverage note: this test scopes to the DriveAuthFallback state. The
    // authenticated picker state requires a live OAuth flow and is not covered
    // by this suite.
    it('has no violations in auth-prompt state (missing clientId)', async () => {
        // oneDrive is not in the default sources list; pass it explicitly
        const { container } = renderUploader({ sources: ['oneDrive'] })
        await activateSource(container, 'oneDrive')
        const results = await scanSlot(container, 'onedrive-uploader')
        expect(results).toHaveNoViolations()
    })
})

describe('axe — FileList', () => {
    it('has no violations with files added', async () => {
        const { container } = renderUploader()
        const input = container.querySelector(
            '[data-testid="upup-file-input"]',
        ) as HTMLInputElement
        expect(input).not.toBeNull()

        const file1 = new File([new Uint8Array(2048).fill(120)], 'alpha.txt', {
            type: 'text/plain',
        })
        const file2 = new File([new Uint8Array(2048).fill(120)], 'beta.txt', {
            type: 'text/plain',
        })

        stubFileInput(input, [file1, file2])

        await waitFor(() => {
            const fl = container.querySelector('[data-upup-slot="file-list"]')
            if (!fl || fl.className.includes('upup-hidden'))
                throw new Error('file-list still hidden')
        })

        const results = await scanSlot(container, 'file-list', {
            rules: {
                // FileList footer buttons nest inside the list region; intentional.
                'nested-interactive': { enabled: false },
            },
        })
        expect(results).toHaveNoViolations()
    })
})

describe('axe — FilePreview', () => {
    it('has no violations for a single file preview', async () => {
        const { container } = renderUploader()
        const input = container.querySelector(
            '[data-testid="upup-file-input"]',
        ) as HTMLInputElement

        const file = new File([new Uint8Array(2048).fill(120)], 'preview.txt', {
            type: 'text/plain',
        })

        stubFileInput(input, [file])

        // Wait for FileItem (and thus FilePreview) to render inside FileList
        await waitFor(() => {
            const p = container.querySelector('[data-upup-slot="file-preview"]')
            if (!p) throw new Error('file-preview slot not yet rendered')
        })

        const results = await scanSlot(container, 'file-preview', {
            rules: {
                // FilePreview card is role="button" (keyboard-activatable) yet
                // contains nested controls (remove/edit buttons) — the same
                // intentional clickable-region pattern already accepted for
                // UploaderPanel / FileList / UploaderHeader. Keyboard activation is the
                // accessibility win; the nested-interactive rule is disabled to
                // match those precedents and the svelte/angular reference.
                'nested-interactive': { enabled: false },
            },
        })
        expect(results).toHaveNoViolations()
    })
})

describe('axe — SourceView (SourceView)', () => {
    it('has no violations in header region when any adapter is active', async () => {
        const { container } = renderUploader()
        await activateSource(container, 'url')

        const sourceView = container.querySelector(
            '[data-upup-slot="source-view"]',
        ) as HTMLElement
        expect(sourceView).not.toBeNull()

        // Scope to the header (first child div) so we don't re-scan the inner
        // UrlUploader — that's covered by the UrlUploader describe block.
        const header = sourceView.firstElementChild as HTMLElement
        expect(header).not.toBeNull()

        const results = await axe(header)
        expect(results).toHaveNoViolations()
    })
})

describe('axe — UploaderHeader (header slot)', () => {
    it('has no violations with files loaded', async () => {
        const { container } = renderUploader()
        const input = container.querySelector(
            '[data-testid="upup-file-input"]',
        ) as HTMLInputElement

        const file = new File(
            [new Uint8Array(1024).fill(0x42)],
            'header-test.txt',
            { type: 'text/plain' },
        )
        stubFileInput(input, [file])

        await waitFor(() => {
            const h = container.querySelector('[data-upup-slot="header"]')
            if (!h) throw new Error('header slot not rendered yet')
        })

        const results = await scanSlot(container, 'header', {
            rules: {
                // Header buttons live inline with the headline; intentional.
                'nested-interactive': { enabled: false },
            },
        })
        expect(results).toHaveNoViolations()
    })
})

// Note: DriveAuthFallback a11y is covered at the live-browser level via the
// Playwright adapters.spec.ts auth-prompt specs. In jsdom the Google Drive
// SDK never loads, so the fallback route isn't reachable from a unit test.
