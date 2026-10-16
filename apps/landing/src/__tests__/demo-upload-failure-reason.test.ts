// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const capture = vi.hoisted(() => vi.fn())
vi.mock('@/lib/analytics/capture.client', () => ({
    captureClientEvent: capture,
}))

import {
    MAX_FAILURE_REASON_LENGTH,
    observeDemoUploads,
    sanitizeFailureReason,
} from '@/lib/analytics/demo-upload-tracking'

// The funnel is read off the uploader root's `data-state`. These tests drive
// the real MutationObserver path in a DOM: flip the state the way the uploader
// does and assert what reaches analytics, in particular the failure details
// read off the uploader's `upup-upload-error` line.

function mountUploader() {
    const container = document.createElement('div')
    const root = document.createElement('div')
    root.dataset.testid = 'upup-root'
    root.setAttribute('data-state', 'ready')
    container.append(root)
    document.body.append(container)
    return { container, root }
}

function showError(root: HTMLElement, text: string, code?: string) {
    const line = document.createElement('p')
    line.dataset.testid = 'upup-upload-error'
    if (code) line.setAttribute('title', code)
    line.textContent = text
    root.append(line)
}

async function setState(root: HTMLElement, state: string) {
    root.setAttribute('data-state', state)
    // MutationObserver callbacks run as a microtask after the change.
    await Promise.resolve()
}

describe('demo upload failure details', () => {
    let stop: () => void
    let root: HTMLElement

    beforeEach(() => {
        capture.mockClear()
        const mounted = mountUploader()
        root = mounted.root
        stop = observeDemoUploads(mounted.container, 'interactive-demo')
    })

    afterEach(() => {
        stop()
        document.body.replaceChildren()
    })

    it('sends the failure code and reason with demo_upload_failed', async () => {
        await setState(root, 'uploading')
        showError(
            root,
            'Upload failed with error code PRESIGN_FAILED: Failed to fetch',
            'PRESIGN_FAILED',
        )
        await setState(root, 'failed')

        expect(capture).toHaveBeenLastCalledWith('demo_upload_failed', {
            surface: 'interactive-demo',
            route: '/',
            failure_code: 'PRESIGN_FAILED',
            failure_reason:
                'Upload failed with error code PRESIGN_FAILED: Failed to fetch',
        })
    })

    it('leaves the started and succeeded events without failure details', async () => {
        showError(root, 'Upload failed: old error', 'OLD')
        await setState(root, 'uploading')
        await setState(root, 'successful')

        expect(capture.mock.calls).toEqual([
            [
                'demo_upload_started',
                { surface: 'interactive-demo', route: '/' },
            ],
            [
                'demo_upload_succeeded',
                { surface: 'interactive-demo', route: '/' },
            ],
        ])
    })

    it('still reports a failure when the uploader shows no error line', async () => {
        await setState(root, 'uploading')
        await setState(root, 'failed')

        expect(capture).toHaveBeenLastCalledWith('demo_upload_failed', {
            surface: 'interactive-demo',
            route: '/',
        })
    })

    it('drops a title that is not a machine code', async () => {
        await setState(root, 'uploading')
        showError(root, 'Upload failed: nope', 'my photo (1).png')
        await setState(root, 'failed')

        const props = capture.mock.lastCall![1] as Record<string, unknown>
        expect(props).not.toHaveProperty('failure_code')
        expect(props.failure_reason).toBe('Upload failed: nope')
    })

    it('never sends a file name, a URL or a signature', async () => {
        await setState(root, 'uploading')
        showError(
            root,
            'Upload failed: PUT https://bucket.s3.example.com/up/holiday.jpg?X-Amz-Signature=abc123 failed for "holiday.jpg"',
            'STORAGE_ERROR',
        )
        await setState(root, 'failed')

        const props = capture.mock.lastCall![1] as Record<string, unknown>
        expect(JSON.stringify(props)).not.toMatch(
            /holiday|amazonaws|s3\.example|Signature|abc123/,
        )
        expect(props.failure_reason).toBe(
            'Upload failed: PUT [url] failed for [redacted]',
        )
    })

    it('stops capturing once disconnected', async () => {
        stop()
        await setState(root, 'uploading')
        expect(capture).not.toHaveBeenCalled()
    })
})

describe('sanitizeFailureReason', () => {
    it('replaces file names, quoted text, URLs and long tokens', () => {
        expect(
            sanitizeFailureReason(
                'Could not read photo.final.HEIC from "My Trip" at http://x.test/a?b=1',
            ),
        ).toBe('Could not read [file] from [redacted] at [url]')
        expect(
            sanitizeFailureReason(`Bad token ${'A1b2'.repeat(10)} rejected`),
        ).toBe('Bad token [token] rejected')
    })

    it('keeps an apostrophe in prose', () => {
        expect(sanitizeFailureReason("Can't reach storage, it isn't up")).toBe(
            "Can't reach storage, it isn't up",
        )
    })

    it('collapses whitespace and caps the length', () => {
        const long = sanitizeFailureReason(
            `Upload   failed ${'word '.repeat(60)}`,
        )
        expect(long.length).toBe(MAX_FAILURE_REASON_LENGTH)
        expect(long.endsWith('…')).toBe(true)
        expect(long).not.toMatch(/\s{2,}/)
    })

    it('returns an empty string for empty text', () => {
        expect(sanitizeFailureReason('  \n ')).toBe('')
    })
})
