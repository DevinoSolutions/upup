// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const capture = vi.hoisted(() => vi.fn())
vi.mock('@/lib/analytics/capture.client', () => ({
    captureClientEvent: capture,
}))

import {
    FAILURE_REASON_PHRASES,
    UNCLASSIFIED_FAILURE_REASON,
    failureReasonFor,
    observeDemoUploads,
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
            failure_reason: 'network request failed',
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
        expect(props.failure_reason).toBe(UNCLASSIFIED_FAILURE_REASON)
    })

    it('never sends the uploader text itself, only an allow-listed phrase', async () => {
        await setState(root, 'uploading')
        showError(
            root,
            'Upload failed: PUT https://bucket.s3.example.com/up/holiday.jpg?X-Amz-Signature=abc123 failed for "holiday.jpg"',
            'STORAGE_ERROR',
        )
        await setState(root, 'failed')

        const props = capture.mock.lastCall![1] as Record<string, unknown>
        expect(JSON.stringify(props)).not.toMatch(
            /holiday|amazonaws|s3.example|abc123/,
        )
        expect(FAILURE_REASON_PHRASES).toContain(props.failure_reason)
    })

    it('stops capturing once disconnected', async () => {
        stop()
        await setState(root, 'uploading')
        expect(capture).not.toHaveBeenCalled()
    })
})

describe('failureReasonFor', () => {
    it.each([
        ['Upload failed: Failed to fetch', 'network request failed'],
        [
            'NetworkError when attempting to fetch resource.',
            'network request failed',
        ],
        [
            'Blocked by CORS policy: No Access-Control-Allow-Origin',
            'blocked by browser cross-origin (CORS) policy',
        ],
        ['The request timed out', 'request timed out'],
        [
            'EntityTooLarge: Your proposed upload exceeds the maximum',
            'file larger than the allowed size',
        ],
        ['File type not allowed', 'file type not allowed'],
        [
            'AccessDenied: Request has expired',
            'upload permission or signed URL rejected',
        ],
        ['NoSuchBucket', 'storage or server error'],
    ])('classifies %j as %j', (text, reason) => {
        expect(failureReasonFor(text)).toBe(reason)
    })

    // Strings that carry a name, address, path or credential in prose the
    // keyword list does not recognise: none of it may come out.
    it.each([
        'The file My Holiday Photo 2024 is not what we expected',
        'File IMG_1234 could not be read',
        'Failed to upload john.doe@gmail.com resume',
        '/home/amin/tax return.pdf not readable',
        'C:\Users\amin\Desktop\tax return.pdf not readable',
        'fichier „été.jpg“ trop gros — vacances été',
        'signature=abc123def&expires=1 AKIAIOSFODNN7EXAMPLE',
    ])('sends only a fixed phrase for %j', text => {
        const reason = failureReasonFor(text)
        expect(FAILURE_REASON_PHRASES).toContain(reason)
        expect(reason).not.toMatch(
            /holiday|IMG_|john|gmail|amin|tax|été|abc123|AKIA/i,
        )
    })

    it('falls back to the unclassified phrase', () => {
        expect(failureReasonFor('something odd happened')).toBe(
            UNCLASSIFIED_FAILURE_REASON,
        )
    })

    it('keeps every phrase short and scans a huge message quickly', () => {
        for (const phrase of FAILURE_REASON_PHRASES) {
            expect(phrase.length).toBeLessThanOrEqual(120)
        }
        const started = performance.now()
        failureReasonFor('a.'.repeat(1e6))
        expect(performance.now() - started).toBeLessThan(500)
    })
})
