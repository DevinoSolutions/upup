import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import {
    act,
    cleanup,
    fireEvent,
    render,
    waitFor,
} from '@testing-library/react'
import React from 'react'
import { FileSource } from '@useupup/core'
import { UpupUploader } from '../src'
import { uploadSourceObject } from '../src/lib/constants'

/**
 * The first click on a Dropbox / OneDrive / Box tile must reach `window.open`
 * inside the click itself. The drive views are separate lazy chunks, so the
 * click used to fetch a chunk, show the Suspense fallback and start sign-in
 * only after the chunk arrived, in a later task, where a strict popup blocker
 * (Edge) refuses the window.
 *
 * `fireEvent.click` runs the dispatch inside a synchronous `act()`: React
 * flushes the click's state update, the mount, its effects and the effects'
 * own state updates before it returns, but no promise job and no timer runs.
 * Asserting straight after it, with no `await`, is therefore exactly the claim
 * "nothing between the click and `window.open` waits on a promise or a timer".
 *
 * Each case uses its own provider because a chunk, once loaded, stays loaded
 * for the rest of the file. The unpreloaded case goes first for the same reason.
 */

type Preloadable = { preload?: () => Promise<unknown> }

let open: ReturnType<typeof vi.spyOn>

beforeEach(() => {
    // A refused window keeps the attempt short; the assertion is about the call.
    open = vi.spyOn(window, 'open').mockReturnValue(null)
})

afterEach(() => {
    cleanup()
    vi.restoreAllMocks()
})

function renderUploader() {
    return render(
        <UpupUploader
            provider="aws"
            uploadEndpoint="/api/upload"
            sources={['local', 'dropbox', 'oneDrive', 'box', 'googleDrive']}
            cloudDrives={{
                dropbox: { clientId: 'dropbox-test-client' },
                oneDrive: { clientId: 'one-drive-test-client' },
                box: { clientId: 'box-test-client' },
            }}
        />,
    )
}

/** Load the chunk the way the browser's preload does, through the module and the helper. */
async function preloadChunk(
    source: FileSource,
    modulePath: () => Promise<unknown>,
) {
    await modulePath()
    await (
        uploadSourceObject[source].Component as Preloadable | undefined
    )?.preload?.()
}

describe('a drive tile click opens the sign-in popup inside the click', () => {
    it('still reaches window.open once the chunk arrives when nothing preloaded it (lazy fallback path)', async () => {
        const { getByTestId } = renderUploader()

        fireEvent.click(getByTestId('upup-source-dropbox'))

        // The view has not mounted yet: its chunk is still on the way.
        expect(open).not.toHaveBeenCalled()
        await waitFor(() => {
            expect(open).toHaveBeenCalledTimes(1)
        })
        expect(open.mock.calls[0]?.[0]).toBe('about:blank')
    })

    it('mounts the OneDrive view and calls window.open synchronously on the first tile click when the chunk is already loaded', async () => {
        await preloadChunk(
            FileSource.ONE_DRIVE,
            () => import('../src/components/OneDriveUploader'),
        )
        const { getByTestId, container } = renderUploader()

        fireEvent.click(getByTestId('upup-source-oneDrive'))

        expect(open).toHaveBeenCalledTimes(1)
        expect(open.mock.calls[0]?.[0]).toBe('about:blank')
        expect(
            container.querySelector('[data-upup-slot="one-drive-uploader"]'),
        ).not.toBeNull()
        await act(async () => {})
    })

    it('warms the Box chunk from the source selector alone, so the first Box click opens the popup synchronously', async () => {
        const { getByTestId } = renderUploader()
        const box = uploadSourceObject[FileSource.BOX].Component as
            (Preloadable & { isLoaded?: () => boolean }) | undefined

        await waitFor(() => {
            expect(box?.isLoaded?.()).toBe(true)
        })
        fireEvent.click(getByTestId('upup-source-box'))

        expect(open).toHaveBeenCalledTimes(1)
        await act(async () => {})
    })

    it('leaves a source that is not a popup-drive chunk unfetched until the pointer reaches its tile', async () => {
        const { getByTestId } = renderUploader()
        const box = uploadSourceObject[FileSource.BOX]
            .Component as Preloadable & {
            isLoaded: () => boolean
        }
        const google = uploadSourceObject[FileSource.GOOGLE_DRIVE]
            .Component as Preloadable & { isLoaded: () => boolean }
        // Box finishing proves the idle pass has run; Google Drive is not in it.
        await waitFor(() => {
            expect(box.isLoaded()).toBe(true)
        })
        expect(google.isLoaded()).toBe(false)

        fireEvent.pointerEnter(getByTestId('upup-source-googleDrive'))

        await waitFor(() => {
            expect(google.isLoaded()).toBe(true)
        })
    })
})
