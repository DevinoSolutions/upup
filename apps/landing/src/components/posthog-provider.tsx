'use client'

import { usePathname } from 'next/navigation'
import { ReactNode, useEffect } from 'react'
import {
    clientDatasetCredentials,
    e2eSuperProperties,
    readE2ETestContext,
} from '@/lib/analytics/dataset'
import {
    isMarketingLandingPath,
    isOAuthRedirectPath,
} from '@/lib/analytics/landing-routes'
import { setPostHogClient } from '@/lib/analytics/posthog-client'
import {
    TELEMETRY_PATH,
    rewriteTelemetryPath,
} from '@/lib/analytics/telemetry-proxy'

// Guard against re-initialising during React Strict Mode's double-invoke and
// across client-side navigations (the provider lives in the root layout).
let bootStarted = false

// Where a deferred landing visit started, so its $pageview is still recorded if
// the visitor navigates away before PostHog has booted.
let deferredEntry: { href: string; pathname: string; at: Date } | null = null

// Landing routes wait for the load event, then for an idle slot (capped), or
// for the visitor's first input, whichever comes first.
const IDLE_TIMEOUT_MS = 2000
const FIRST_INPUT_EVENTS = ['pointerdown', 'keydown'] as const

function bootPostHog(): void {
    if (bootStarted) return
    // Dataset drives which project (if any) receives events. `disabled`
    // skips init entirely; `e2e` targets the separate test project.
    const { dataset, host, token } = clientDatasetCredentials()
    if (dataset === 'disabled' || !token) return
    bootStarted = true

    // posthog-js is loaded here, never statically: a static import from the
    // root layout put the whole SDK on every page's first load.
    void import('posthog-js')
        .then(({ default: posthog }) => {
            posthog.init(token, {
                // Same-origin path, so ad blockers that filter the PostHog
                // host or its well-known paths still let events through.
                // next.config rewrites it to `host`, which stays the UI host
                // so toolbar and dashboard links resolve.
                api_host: TELEMETRY_PATH,
                ui_host: host,
                rewriteRequestPath: rewriteTelemetryPath,
                capture_pageview: 'history_change',
                capture_pageleave: true,
                autocapture: true,
                person_profiles: 'identified_only',
                // No PostHog surveys run on this site, and the self-hosted
                // instance answers the versioned surveys.js path with a
                // redirect to its login page, so loading it only produced a
                // CORS error in every visitor's console. Re-enable if surveys
                // are ever added.
                disable_surveys: true,
                // Session-replay privacy defaults. Replay itself stays
                // dashboard-controlled (not force-enabled here); when a session
                // IS recorded, inputs are masked and any [data-ph-mask] text is
                // hidden.
                session_recording: {
                    maskAllInputs: true,
                    maskTextSelector: '[data-ph-mask]',
                },
                // e2e ONLY: posthog-js drops events from likely bots
                // (automation user-agents like Playwright's HeadlessChrome, and
                // navigator.webdriver) by default, so browser captures never
                // ingest and the ingestion-verification query finds nothing.
                // Accept synthetic traffic on the e2e project alone; production
                // keeps the default bot filter (never weaken it). Valid runtime
                // option absent from this posthog-js version's types, so it
                // rides a spread (which skips excess-property checks).
                ...(dataset === 'e2e'
                    ? { opt_out_useragent_filter: true }
                    : {}),
            })

            // On the e2e dataset, tag every browser event with the run's
            // correlation ids (app_id/environment/test_run_id/test_scenario) so
            // the ingestion-verification query can find them. Inert on other
            // datasets.
            const superProps = e2eSuperProperties(dataset, readE2ETestContext())
            if (Object.keys(superProps).length > 0) posthog.register(superProps)

            // init() records the $pageview of the page the visitor is on NOW.
            // If a deferred landing visit already navigated elsewhere, record
            // the landing page's own view too, at the time it happened.
            const entry = deferredEntry
            deferredEntry = null
            if (entry && entry.href !== window.location.href) {
                posthog.capture(
                    '$pageview',
                    {
                        $current_url: entry.href,
                        $pathname: entry.pathname,
                    },
                    { timestamp: entry.at },
                )
            }

            // Replays anything captured while the SDK was loading.
            setPostHogClient(posthog)
        })
        .catch(() => {
            // Analytics failing to load must never break the page.
        })
}

/**
 * Boot PostHog once the page has finished loading: after the `load` event,
 * in the next idle slot (capped at IDLE_TIMEOUT_MS), or on the first
 * pointer/key input if that comes sooner. Returns a cleanup.
 */
function bootAfterLoad(): () => void {
    let idleHandle: number | undefined
    let timeoutHandle: ReturnType<typeof setTimeout> | undefined
    const w = window as Window & {
        requestIdleCallback?: (
            cb: () => void,
            opts?: { timeout: number },
        ) => number
        cancelIdleCallback?: (handle: number) => void
    }

    const cleanup = () => {
        window.removeEventListener('load', onLoad)
        for (const type of FIRST_INPUT_EVENTS)
            window.removeEventListener(type, boot, true)
        if (idleHandle !== undefined) w.cancelIdleCallback?.(idleHandle)
        if (timeoutHandle !== undefined) clearTimeout(timeoutHandle)
    }
    function boot() {
        cleanup()
        bootPostHog()
    }
    function onLoad() {
        if (w.requestIdleCallback)
            idleHandle = w.requestIdleCallback(boot, {
                timeout: IDLE_TIMEOUT_MS,
            })
        else timeoutHandle = setTimeout(boot, 1)
    }

    for (const type of FIRST_INPUT_EVENTS)
        window.addEventListener(type, boot, { capture: true, passive: true })
    if (document.readyState === 'complete') onLoad()
    else window.addEventListener('load', onLoad, { once: true })
    return cleanup
}

export function PostHogProvider({ children }: { children: ReactNode }) {
    const pathname = usePathname()

    useEffect(() => {
        if (typeof window === 'undefined' || bootStarted) return
        // A drive sign-in popup carries the provider's one-time code in its
        // URL; it must never reach a $pageview.
        if (isOAuthRedirectPath(pathname)) return
        // Every route other than the marketing landing pages (docs, support,
        // agent-setup, …) initialises at mount, exactly as before.
        if (!isMarketingLandingPath(pathname)) {
            bootPostHog()
            return
        }
        if (!deferredEntry)
            deferredEntry = {
                href: window.location.href,
                pathname: window.location.pathname,
                at: new Date(),
            }
        return bootAfterLoad()
    }, [pathname])

    return <>{children}</>
}
