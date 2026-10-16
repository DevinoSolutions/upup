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

/**
 * Every code the uploader can show as `failure_code`, and nothing else: the
 * `UpupErrorCode` enum in packages/core/src/errors.ts (copied, not imported, so
 * core stays out of this bundle) plus the S3 / S3-compatible codes the storage
 * layer can return. An exact list rather than a pattern, because a pattern
 * cannot tell `PRESIGN_FAILED` from a code that happens to spell a name.
 * demo-upload-failure-reason.test.ts reads errors.ts and fails when a core code
 * is missing here, so add new core codes to this list.
 */
const KNOWN_FAILURE_CODES: ReadonlySet<string> = new Set([
    // packages/core/src/errors.ts: UpupErrorCode
    'AUTH_EXPIRED',
    'AUTH_DENIED',
    'AUTH_PROVIDER_ERROR',
    'AUTH_POPUP_BLOCKED',
    'FILE_TOO_LARGE',
    'FILE_TOO_SMALL',
    'TYPE_MISMATCH',
    'LIMIT_EXCEEDED',
    'TOTAL_SIZE_EXCEEDED',
    'DUPLICATE',
    'MIN_FILES_NOT_MET',
    'UPLOAD_FAILED',
    'UPLOAD_ABORTED',
    'PRESIGN_FAILED',
    'CORS_ERROR',
    'PIPELINE_STEP_FAILED',
    'HEIC_CONVERSION_FAILED',
    'NETWORK_ERROR',
    'TIMEOUT',
    'STORAGE_ERROR',
    'QUOTA_EXCEEDED',
    'NO_UPLOAD_TARGET',
    'BAD_REQUEST',
    'AUTH_REQUIRED',
    'NOT_FOUND',
    // S3 and S3-compatible stores
    'EntityTooLarge',
    'AccessDenied',
    'SignatureDoesNotMatch',
    'RequestTimeTooSkewed',
    'SlowDown',
    'NoSuchBucket',
])

/** The code worth sending, or undefined for anything not on the list. */
export function safeFailureCode(code: string | null): string | undefined {
    return code && KNOWN_FAILURE_CODES.has(code) ? code : undefined
}

/**
 * A pattern for an HTTP status that reads as one: next to a word like status /
 * server / gateway, at the start of the text ("503 Service Unavailable"), or
 * followed by its reason word. A bare three-digit number is not enough, since
 * a file name or a size can contain one.
 */
function statusCode(digits: string): string {
    return (
        String.raw`(?:\b(?:status|http|code|error|server|service|gateway)\W{0,3}|^\W*)(?:${digits})\b` +
        String.raw`|\b(?:${digits})\s+(?:payload|request|content|entity|forbidden|unauthori[sz]ed|internal|service|bad|gateway|server)`
    )
}

/**
 * Why a run failed, as one of a fixed set of phrases. The uploader's message
 * can quote third-party error text (S3 XML, browser fetch errors, a custom
 * server's reply) and so a file name, an e-mail address, a path or a
 * credential, in any language, and no pattern list can strip all of that. So
 * the text is only ever matched against these keywords: the phrase is sent,
 * the text is not. First match wins; order puts the specific causes first.
 */
const FAILURE_REASONS: ReadonlyArray<readonly [RegExp, string]> = [
    [/\bcors\b|cross-origin/i, 'blocked by browser cross-origin (CORS) policy'],
    [/timed? ?out|timeout/i, 'request timed out'],
    [/\babort|\bcancel/i, 'upload was cancelled or aborted'],
    [/quota/i, 'storage quota exceeded'],
    [
        new RegExp(
            String.raw`too large|too big|exceed|entitytoolarge|file size|payload too large|${statusCode('413')}`,
            'i',
        ),
        'file larger than the allowed size',
    ],
    [
        /\b(file|mime|content)[ -]?type|unsupported (file|format|type)|extension\W.{0,30}not (allowed|supported)|not (allowed|supported)\W.{0,30}(file|extension|type)/i,
        'file type not allowed',
    ],
    [
        /failed to fetch|networkerror|network error|network request failed|(^|[^a-z])load failed|net::|(^|[^a-z])err_|offline/i,
        'network request failed',
    ],
    [
        new RegExp(
            String.raw`presign|signed url|signature|credential|unauthori[sz]ed|forbidden|access ?denied|expired|auth[ _]?(denied|expired|required|failed)|requesttimetooskewed|${statusCode('40[13]')}`,
            'i',
        ),
        'upload permission or signed URL rejected',
    ],
    [
        new RegExp(
            String.raw`bucket|storage|\bs3\b|server error|service unavailable|bad gateway|slowdown|${statusCode(String.raw`5\d\d`)}`,
            'i',
        ),
        'storage or server error',
    ],
]

/** The sent reason when no keyword matches (the text itself is never sent). */
export const UNCLASSIFIED_FAILURE_REASON = 'unclassified upload error'

/** The most text matched, so a huge message cannot make the scan slow. */
const MAX_MATCHED_LENGTH = 2000

function classify(text: string): string | undefined {
    const haystack = text.slice(0, MAX_MATCHED_LENGTH)
    for (const [pattern, reason] of FAILURE_REASONS) {
        if (pattern.test(haystack)) return reason
    }
    return undefined
}

/**
 * The allow-listed phrase for the uploader's failure message. When the message
 * itself matches nothing, the (already validated) machine code is tried, with
 * its underscores read as spaces, so `FILE_TOO_LARGE` still classifies.
 */
export function failureReasonFor(text: string, code?: string): string {
    return (
        classify(text) ??
        (code ? classify(`${code} ${code.replace(/_/g, ' ')}`) : undefined) ??
        UNCLASSIFIED_FAILURE_REASON
    )
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
    const code = safeFailureCode(line.getAttribute('title'))
    if (code) details.failure_code = code
    if (line.textContent?.trim()) {
        details.failure_reason = failureReasonFor(line.textContent, code)
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
