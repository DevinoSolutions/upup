// src/testing/state-stories.ts
// The three product-state stories' args + play bodies, defined ONCE and consumed
// by the react host's States.stories.tsx (these states were previously proven
// only in Playwright). Plays touch only `canvasElement` + the framework-agnostic
// helpers, and set a `data-upup-play="<key>:done"` marker on completion so an
// external iframe probe (no test-runner wired) has a positive outcome element.
import { buildPngFile } from '../fixtures/pngSample'
import { feedFile, feedFileUntil, waitFor, getRenderedFileNames } from './dom'
import type { PlayContext } from './worker-heic-stories'

// Upload + pipeline run in-browser; a generous ceiling absorbs slow CI.
const T = { timeout: 15000 } as const

// A file is "registered" once the uploader renders a tile for it.
const fileRegistered = (root: HTMLElement): boolean =>
    getRenderedFileNames(root).length > 0

const rootState = (root: HTMLElement): string | null =>
    root
        .querySelector('[data-testid="upup-root"]')
        ?.getAttribute('data-state') ?? null

// The failure UI: FileList renders this <p> only when status is FAILED and an
// error message exists (data-upup-slot="upload-error" / data-testid the same).
const hasErrorSlot = (root: HTMLElement): boolean =>
    !!root.querySelector('[data-testid="upup-upload-error"]')

function waitForInput(root: HTMLElement) {
    return waitFor(() => root.querySelector('input[type="file"]'), T)
}

function markDone(root: HTMLElement, key: string): void {
    root.setAttribute('data-upup-play', `${key}:done`)
}

// A restricted file has NO default rejection UI — the uploader rejects it via the
// onError/onRestrictionFailed callback and never renders a tile. The story wires
// `onError` here; the play drains it. One play runs at a time, so module scope is
// safe (the play clears it on entry).
const rejectionLog: string[] = []
const recordRejection = (message: string): void => {
    rejectionLog.push(message)
}

// autoUpload:true is REQUIRED for the success/error stories — the pipeline +
// upload run only inside core.upload(), scheduled by the orchestrator on
// file-add. (Harmless for the rejection story, whose file never reaches upload.)
export const stateStoryArgs: Record<
    'uploadSuccess' | 'uploadError' | 'restrictedFileRejected',
    Record<string, unknown>
> = {
    uploadSuccess: {
        sources: ['local'],
        autoUpload: true,
        showBranding: false,
    },
    // maxRetries:0 → fail on the first 500 with no retry storm (the mock PUT 500s
    // every attempt; retries would only delay the FAILED state).
    uploadError: {
        sources: ['local'],
        autoUpload: true,
        maxRetries: 0,
        showBranding: false,
    },
    // allowedFileTypes mismatch: feeding a PNG trips TYPE_MISMATCH deterministically
    // (no byte-size math). `onError` captures the rejection the play asserts on.
    restrictedFileRejected: {
        sources: ['local'],
        autoUpload: true,
        allowedFileTypes: 'application/pdf',
        showBranding: false,
        onError: recordRejection,
    },
}

export const stateStoryPlays: Record<
    'uploadSuccess' | 'uploadError' | 'restrictedFileRejected',
    (ctx: PlayContext) => Promise<void>
> = {
    // 1. Happy path: a PNG uploads through the default success handlers; the root
    //    flips to data-state="successful" (the same contract smoke.spec asserts).
    async uploadSuccess({ canvasElement }) {
        await waitForInput(canvasElement)
        await feedFileUntil(
            canvasElement,
            buildPngFile(),
            () => fileRegistered(canvasElement),
            T,
        )
        await waitFor(() => rootState(canvasElement) === 'successful', T)
        markDone(canvasElement, 'upload-success')
    },

    // 2. Downstream failure (object PUT 500 via uploadErrorHandlers): the root
    //    reaches data-state="failed" and the upload-error slot renders.
    async uploadError({ canvasElement }) {
        await waitForInput(canvasElement)
        await feedFileUntil(
            canvasElement,
            buildPngFile(),
            () => fileRegistered(canvasElement),
            T,
        )
        await waitFor(
            () =>
                rootState(canvasElement) === 'failed' &&
                hasErrorSlot(canvasElement),
            T,
        )
        markDone(canvasElement, 'upload-error')
    },

    // 3. Restricted file: a PNG against allowedFileTypes:'application/pdf' is
    //    rejected — onError fires and NO tile is rendered.
    async restrictedFileRejected({ canvasElement }) {
        rejectionLog.length = 0
        await waitForInput(canvasElement)
        // Single feed (not feedFileUntil): the file is rejected, so it never
        // registers a tile and feedFileUntil would spin until timeout.
        feedFile(canvasElement, buildPngFile())
        await waitFor(() => rejectionLog.length > 0, T)
        const tiles = getRenderedFileNames(canvasElement)
        if (tiles.length > 0) {
            throw new Error(
                `restrictedFileRejected: expected no file tile, saw ${JSON.stringify(tiles)}`,
            )
        }
        markDone(canvasElement, 'restricted-file-rejected')
    },
}
