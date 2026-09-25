'use client'

import posthog from 'posthog-js'
import { ReactNode, useEffect } from 'react'
import {
    clientDatasetCredentials,
    e2eSuperProperties,
    readE2ETestContext,
} from '@/lib/analytics/dataset'

// Guard against re-initialising during React Strict Mode's double-invoke.
let initialised = false

export function PostHogProvider({ children }: { children: ReactNode }) {
    useEffect(() => {
        if (typeof window === 'undefined' || initialised) return

        // Dataset drives which project (if any) receives events. `disabled`
        // skips init entirely; `e2e` targets the separate test project.
        const { dataset, host, token } = clientDatasetCredentials()
        if (dataset === 'disabled' || !token) return

        initialised = true
        posthog.init(token, {
            api_host: host,
            capture_pageview: 'history_change',
            capture_pageleave: true,
            autocapture: true,
            person_profiles: 'identified_only',
            // Session-replay privacy defaults. Replay itself stays
            // dashboard-controlled (not force-enabled here); when a session IS
            // recorded, inputs are masked and any [data-ph-mask] text is hidden.
            session_recording: {
                maskAllInputs: true,
                maskTextSelector: '[data-ph-mask]',
            },
            // e2e ONLY: posthog-js drops events from likely bots (automation
            // user-agents like Playwright's HeadlessChrome, and navigator.
            // webdriver) by default, so browser captures never ingest and the
            // ingestion-verification query finds nothing. Accept synthetic
            // traffic on the e2e project alone; production keeps the default bot
            // filter (never weaken it). Valid runtime option absent from this
            // posthog-js version's types, so it rides a spread (which skips
            // excess-property checks).
            ...(dataset === 'e2e' ? { opt_out_useragent_filter: true } : {}),
        })

        // On the e2e dataset, tag every browser event with the run's
        // correlation ids (app_id/environment/test_run_id/test_scenario) so the
        // ingestion-verification query can find them. Inert on other datasets.
        const superProps = e2eSuperProperties(dataset, readE2ETestContext())
        if (Object.keys(superProps).length > 0) posthog.register(superProps)

        // e2e-only affordance: a short-lived automated page closes before
        // posthog's batch flush fires, so expose an awaitable flush the spec
        // calls before it ends (`shutdown()` flushes the queues and resolves).
        // captureClientEvent() delivers through a dynamic import of posthog-js,
        // so a capture fired just before the flush can still be waiting on that
        // import (a dev server compiles the chunk on first request) and would
        // land after shutdown and be lost. Awaiting the same import, then one
        // task, lets every capture already in flight reach the queue first.
        // Never attached on production/disabled.
        if (dataset === 'e2e') {
            ;(
                window as unknown as {
                    __upupFlushAnalytics?: () => Promise<void>
                }
            ).__upupFlushAnalytics = async () => {
                await import('posthog-js')
                await new Promise(resolve => setTimeout(resolve, 0))
                await posthog.shutdown()
            }
        }
    }, [])

    return <>{children}</>
}
