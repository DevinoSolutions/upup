'use client'

import posthog from 'posthog-js'
import { ReactNode, useEffect } from 'react'
import { clientDatasetCredentials } from '@/lib/analytics/dataset'

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
        })
    }, [])

    return <>{children}</>
}
