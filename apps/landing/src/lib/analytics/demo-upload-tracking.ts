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
        if (!el || typeof MutationObserver === 'undefined') return
        const observer = new MutationObserver(mutations => {
            for (const mutation of mutations) {
                const target = mutation.target
                if (!(target instanceof HTMLElement)) continue
                if (target.dataset.testid !== 'upup-root') continue
                const event = demoUploadEventFor(
                    mutation.oldValue,
                    target.getAttribute('data-state'),
                )
                if (!event) continue
                captureClientEvent(event, {
                    surface,
                    route: window.location.pathname,
                })
            }
        })
        observer.observe(el, {
            subtree: true,
            attributes: true,
            attributeFilter: ['data-state'],
            attributeOldValue: true,
        })
        return () => observer.disconnect()
    }, [container, surface])
}
