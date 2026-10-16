'use client'

import { useEffect, type RefObject } from 'react'
import { captureClientEvent } from './capture.client'
import {
    DEMO_UPLOAD_FAILED,
    DEMO_UPLOAD_STARTED,
    DEMO_UPLOAD_SUCCEEDED,
} from './contract'

/** Which live demo an upload came from. */
export type DemoSurface = 'interactive-demo' | 'docs-demo'

/**
 * The funnel event for one change of the uploader root's `data-state` (the
 * lower-cased core UploadStatus), or null when the change is not a funnel step.
 * A paused run that resumes is the same upload, so `paused -> uploading` is not
 * a second start.
 */
export function demoUploadEventFor(
    previous: string | null,
    next: string | null,
): string | null {
    if (previous === next) return null
    if (next === 'uploading') {
        return previous === 'paused' ? null : DEMO_UPLOAD_STARTED
    }
    if (next === 'successful') return DEMO_UPLOAD_SUCCEEDED
    if (next === 'failed') return DEMO_UPLOAD_FAILED
    return null
}

/** Machine codes (`PRESIGN_FAILED`, `EntityTooLarge`, ...) are short tokens. */
const FAILURE_CODE = /^[A-Za-z0-9_.:-]{1,60}$/

/**
 * Why a run failed, as one of a fixed set of phrases. The uploader's message
 * can quote third-party error text (S3 XML, browser fetch errors, a custom
 * server's reply) and so a file name, an e-mail address, a path or a
 * credential, in any language, and no pattern list can strip all of that. So
 * the text is only ever matched against these keywords: the phrase is sent,
 * the text is not. First match wins; order puts the specific causes first.
 */
const FAILURE_REASONS: ReadonlyArray<readonly [RegExp, string]> = [
    [/cors|cross-origin/i, 'blocked by browser cross-origin (CORS) policy'],
    [/timed? ?out|timeout/i, 'request timed out'],
    [/abort|cancel/i, 'upload was cancelled or aborted'],
    [
        /too large|too big|exceeds|entitytoolarge|file size|payload/i,
        'file larger than the allowed size',
    ],
    [
        /not allowed|unsupported|invalid (file )?type|mime|extension/i,
        'file type not allowed',
    ],
    [
        /failed to fetch|networkerror|network error|(^|[^a-z])load failed|net::|err_|offline/i,
        'network request failed',
    ],
    [
        /presign|signed url|signature|credential|unauthori[sz]ed|forbidden|access ?denied|expired|\b40[13]\b/i,
        'upload permission or signed URL rejected',
    ],
    [/quota/i, 'storage quota exceeded'],
    [
        /bucket|storage|\bs3\b|server error|\b5\d\d\b/i,
        'storage or server error',
    ],
]

/** The sent reason when no keyword matches (the text itself is never sent). */
export const UNCLASSIFIED_FAILURE_REASON = 'unclassified upload error'

/** The most text matched, so a huge message cannot make the scan slow. */
const MAX_MATCHED_LENGTH = 2000

/** The allow-listed phrase for the uploader's failure message. */
export function failureReasonFor(text: string): string {
    const haystack = text.slice(0, MAX_MATCHED_LENGTH)
    for (const [pattern, reason] of FAILURE_REASONS) {
        if (pattern.test(haystack)) return reason
    }
    return UNCLASSIFIED_FAILURE_REASON
}

/** Every phrase `failure_reason` can take. */
export const FAILURE_REASON_PHRASES: readonly string[] = [
    ...FAILURE_REASONS.map(([, reason]) => reason),
    UNCLASSIFIED_FAILURE_REASON,
]

/**
 * What the uploader shows about a failed run, read from its error line
 * (`upup-upload-error`: the message as text, the machine code as `title`).
 * That line is all the DOM exposes: the file's type, size and source are not
 * on any data attribute, and reading them off visible text would risk the file
 * name, so they are deliberately not sent. Empty when the uploader is showing
 * no error line.
 */
export function failureDetails(root: HTMLElement): {
    failure_code?: string
    failure_reason?: string
} {
    const line = root.querySelector('[data-testid="upup-upload-error"]')
    if (!line) return {}
    const details: { failure_code?: string; failure_reason?: string } = {}
    const code = line.getAttribute('title')
    if (code && FAILURE_CODE.test(code)) details.failure_code = code
    if (line.textContent?.trim()) {
        details.failure_reason = failureReasonFor(line.textContent)
    }
    return details
}

/**
 * Start capturing the upload funnel of every uploader inside `container`;
 * returns the function that stops it. A failed run also carries
 * `failure_code` / `failure_reason` when the uploader shows them.
 */
export function observeDemoUploads(
    container: HTMLElement,
    surface: DemoSurface,
): () => void {
    if (typeof MutationObserver === 'undefined') return () => undefined
    const observer = new MutationObserver(mutations => {
        for (const mutation of mutations) {
            const target = mutation.target
            if (!(target instanceof HTMLElement)) continue
            if (target.dataset.testid !== 'upup-root') continue
            const next = target.getAttribute('data-state')
            const event = demoUploadEventFor(mutation.oldValue, next)
            if (!event) continue
            captureClientEvent(event, {
                surface,
                route: window.location.pathname,
                ...(event === DEMO_UPLOAD_FAILED ? failureDetails(target) : {}),
            })
        }
    })
    observer.observe(container, {
        subtree: true,
        attributes: true,
        attributeFilter: ['data-state'],
        attributeOldValue: true,
    })
    return () => observer.disconnect()
}

/**
 * Capture the upload funnel of every uploader mounted inside `container`.
 *
 * The demos render `<UpupUploader>` through packages (and a dynamic import)
 * that know nothing about analytics, so this watches the one public signal
 * they all share: the root's `data-state` attribute. Watching the container,
 * not a root, also covers the interactive example remounting its preview when
 * the visitor changes the config.
 */
export function useDemoUploadTracking(
    container: RefObject<HTMLElement | null>,
    surface: DemoSurface,
): void {
    useEffect(() => {
        const el = container.current
        if (!el) return
        return observeDemoUploads(el, surface)
    }, [container, surface])
}
