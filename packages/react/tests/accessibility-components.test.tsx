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
