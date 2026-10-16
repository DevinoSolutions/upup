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

/** Longest `failure_reason` sent: a short label, never a log line. */
export const MAX_FAILURE_REASON_LENGTH = 120

/** Machine codes (`PRESIGN_FAILED`, `EntityTooLarge`, ...) are short tokens. */
const FAILURE_CODE = /^[A-Za-z0-9_.:-]{1,60}$/

/**
 * The uploader's failure message with anything that could identify the visitor
 * or carry a credential removed, capped at MAX_FAILURE_REASON_LENGTH. The
 * message is the uploader's own text and can quote the underlying error, so a
 * file name, a URL (a presigned one carries its signature) or a long token may
 * appear in it; none of those may reach analytics.
 */
export function sanitizeFailureReason(text: string): string {
    const clean = text
        .replace(/[a-z][a-z0-9+.-]*:\/\/\S+/gi, '[url]')
        .replace(/X-Amz-[\w-]+=\S*/gi, '[redacted]')
        .replace(/"[^"]*"|\x60[^\x60]*\x60|“[^”]*”/g, '[redacted]')
        .replace(/(^|[\s([])'[^']*'/g, '$1[redacted]')
        .replace(/[^\s"'\x60/\<>|?*:]+\.[A-Za-z0-9]{1,8}\b/g, '[file]')
        .replace(/[A-Za-z0-9+/_=-]{32,}/g, '[token]')
        .replace(/\s+/g, ' ')
        .trim()
    return clean.length > MAX_FAILURE_REASON_LENGTH
        ? `${clean.slice(0, MAX_FAILURE_REASON_LENGTH - 1)}…`
        : clean
}

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
    const reason = sanitizeFailureReason(line.textContent ?? '')
    if (reason) details.failure_reason = reason
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
