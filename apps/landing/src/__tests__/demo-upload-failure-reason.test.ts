// @vitest-environment jsdom
import { readFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
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
    safeFailureCode,
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

    it('drops a title that is not an allow-listed machine code', async () => {
        await setState(root, 'uploading')
        showError(root, 'Upload failed: nope', 'AKIAIOSFODNN7EXAMPLE')
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

const BASE64URL_59 =
    'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9_abcDEF-ghiJKL0123456789xyz'.slice(
        0,
        59,
    )

describe('safeFailureCode', () => {
    it.each(['PRESIGN_FAILED', 'FILE_TOO_LARGE', 'EntityTooLarge', 'SlowDown'])(
        'keeps the machine code %j',
        code => {
            expect(safeFailureCode(code)).toBe(code)
        },
    )

    // The core enum is the source of the list; a code added there and not to
    // KNOWN_FAILURE_CODES would silently never reach analytics.
    it('keeps every UpupErrorCode of packages/core/src/errors.ts', () => {
        // fileURLToPath on the string: jsdom replaces the global URL class.
        const here = dirname(fileURLToPath(import.meta.url))
        const source = readFileSync(
            resolve(here, '../../../../packages/core/src/errors.ts'),
            'utf8',
        )
        const body = /export enum UpupErrorCode \{([\s\S]*?)\n\}/.exec(source)
        expect(body).not.toBeNull()
        const members = body![1]!
        const codes = [
            ...members.matchAll(/^\s*([A-Z0-9_]+) = '([A-Z0-9_]+)'/gm),
        ]
        // Every member line (`NAME =` of any shape) must have parsed, so a
        // member the pattern cannot read fails here instead of being skipped.
        const memberLines = members.match(/^\s*[A-Za-z0-9_]+\s*=/gm) ?? []
        expect(codes.length).toBeGreaterThan(20)
        expect(codes).toHaveLength(memberLines.length)
        for (const [, name, value] of codes) {
            expect(name).toBe(value)
            expect(safeFailureCode(value!)).toBe(value)
        }
    })

    it.each([
        'holiday.jpg',
        'JOHN_DOE_RESUME_PDF',
        'AKIA_IOSFODNN7_EXAMPLE',
        'john.doe',
        'AKIAIOSFODNN7EXAMPLE',
        'ACCESSDENIED',
        'my photo (1).png',
        'lower_case_code',
        'A'.repeat(41),
        // 59 characters of base64url, as a token or key would be.
        BASE64URL_59,
        '',
        null,
    ])('drops %j', code => {
        expect(safeFailureCode(code)).toBeUndefined()
    })
})

describe('failureReasonFor', () => {
    it.each([
        ['Upload failed: Failed to fetch', 'network request failed'],
        [
            'NetworkError when attempting to fetch resource.',
            'network request failed',
        ],
        ['Load failed', 'network request failed'],
        ['net::ERR_CONNECTION_RESET', 'network request failed'],
        ['ERR_CONNECTION_RESET', 'network request failed'],
        [
            'Blocked by CORS policy: No Access-Control-Allow-Origin',
            'blocked by browser cross-origin (CORS) policy',
        ],
        ['The request timed out', 'request timed out'],
        [
            'EntityTooLarge: Your proposed upload exceeds the maximum',
            'file larger than the allowed size',
        ],
        ['413 Payload Too Large', 'file larger than the allowed size'],
        [
            'Server responded with status 413',
            'file larger than the allowed size',
        ],
        ['File type not allowed', 'file type not allowed'],
        [
            'AccessDenied: Request has expired',
            'upload permission or signed URL rejected',
        ],
        ['HTTP 403', 'upload permission or signed URL rejected'],
        ['503 Service Unavailable', 'storage or server error'],
        ['Server responded with status 502', 'storage or server error'],
        ['NoSuchBucket', 'storage or server error'],
        ['Storage quota exceeded', 'storage quota exceeded'],
        ['The server returned 504', 'storage or server error'],
        ['Server responded with 503', 'storage or server error'],
        ['File size exceeded the limit', 'file larger than the allowed size'],
        ['Upload exceeds 10 MB', 'file larger than the allowed size'],
        ['Total size exceeded', 'file larger than the allowed size'],
        [
            'The file exceeds the 10MB limit',
            'file larger than the allowed size',
        ],
        ['exceeds 10MB', 'file larger than the allowed size'],
        ['10 MB exceeded', 'file larger than the allowed size'],
    ])('classifies %j as %j', (text, reason) => {
        expect(failureReasonFor(text)).toBe(reason)
    })

    it.each([
        ['FILE_TOO_LARGE', 'file larger than the allowed size'],
        ['TOTAL_SIZE_EXCEEDED', 'file larger than the allowed size'],
        ['NETWORK_ERROR', 'network request failed'],
        ['AUTH_DENIED', 'upload permission or signed URL rejected'],
    ])(
        'classifies by the machine code %s when the text has no keyword',
        (code, reason) => {
            expect(failureReasonFor('Upload failed: something', code)).toBe(
                reason,
            )
        },
    )

    it('lets the machine code win only when the text matches nothing', () => {
        expect(failureReasonFor('Upload failed: something', 'CORS_ERROR')).toBe(
            'blocked by browser cross-origin (CORS) policy',
        )
        expect(failureReasonFor('Upload failed: something', 'TIMEOUT')).toBe(
            'request timed out',
        )
        // The text names a cause, so the code is not consulted.
        expect(failureReasonFor('Failed to fetch', 'FILE_TOO_LARGE')).toBe(
            'network request failed',
        )
        // Neither names a cause.
        expect(failureReasonFor('Upload failed', 'LIMIT_EXCEEDED')).toBe(
            UNCLASSIFIED_FAILURE_REASON,
        )
    })

    // Plain words and bare numbers that an earlier, looser keyword list took
    // for a cause.
    it.each([
        'Upload failed',
        'Upload failed: nope',
        'No records found',
        'Missing payload',
        'IMG 503.jpg could not be read',
        'The extension host crashed',
        'mime',
        'Entry 413 of 600 was skipped',
        'error: 512 MB limit',
        'Error 512 bytes',
        'Maximum of 5 files exceeded',
        'Limit exceeded',
        'The lamb exceeded expectations',
    ])('leaves %j unclassified', text => {
        expect(failureReasonFor(text)).toBe(UNCLASSIFIED_FAILURE_REASON)
    })

    // Strings that carry a name, address, path or credential in prose the
    // keyword list does not recognise: only a fixed phrase may come out.
    it.each([
        'The file My Holiday Photo 2024 is not what we expected',
        'File IMG_1234 could not be read',
        'Failed to upload john.doe@gmail.com resume',
        '/home/amin/tax return.pdf not readable',
        String.raw`C:\Users\amin\Desktop\tax return.pdf not readable`,
        'fichier „été.jpg“ trop gros — vacances été',
        'signature=abc123def&expires=1 AKIAIOSFODNN7EXAMPLE',
    ])('sends only a fixed phrase for %j', text => {
        expect(FAILURE_REASON_PHRASES).toContain(failureReasonFor(text))
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
