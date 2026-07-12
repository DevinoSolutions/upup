'use client'

import posthog from 'posthog-js'
import { ReactNode, useEffect } from 'react'
import { clientEnv } from '@/lib/env'

const POSTHOG_KEY = clientEnv.NEXT_PUBLIC_POSTHOG_KEY
const POSTHOG_HOST = clientEnv.NEXT_PUBLIC_POSTHOG_HOST

// Guard against re-initialising during React Strict Mode's double-invoke.
let initialised = false

export function PostHogProvider({ children }: { children: ReactNode }) {
    useEffect(() => {
        // No-op when the key is unset so builds/boots never depend on PostHog.
        if (!POSTHOG_KEY || typeof window === 'undefined' || initialised) return

        initialised = true
        posthog.init(POSTHOG_KEY, {
            api_host: POSTHOG_HOST,
            capture_pageview: 'history_change',
            capture_pageleave: true,
            autocapture: true,
            person_profiles: 'identified_only',
        })
    }, [])

    return <>{children}</>
}
