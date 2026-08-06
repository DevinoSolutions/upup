'use client'

import { useCallback, useEffect, useState } from 'react'
import {
    InteractiveExample,
    type InteractiveExampleProps,
    type AiFeedbackEvent,
} from '@upupjs/interactive-example'
import { captureClientEvent } from '@/lib/analytics/capture.client'

/**
 * Client wrapper that injects the two client-only pieces the Ask-AI panel needs
 * into `aiAssistant`:
 *
 *   - `posthogDistinctId` — the visitor's PostHog distinct id, so an AI trace's
 *     distinct id matches whoever later rates the response.
 *   - `onAiFeedback` — the sink that forwards thumbs ratings / comments to
 *     PostHog via `posthog.capture`.
 *
 * Both live here rather than in the server prop builder because a function prop
 * can't cross the RSC boundary and `posthog.get_distinct_id()` only exists on
 * the client. Delivery goes through the shared, dataset-gated
 * `captureClientEvent` — the interactive-example package itself stays
 * PostHog-free.
 */
export function InteractiveExampleClient(props: InteractiveExampleProps) {
    const [distinctId, setDistinctId] = useState<string | undefined>(undefined)

    useEffect(() => {
        let cancelled = false
        void import('posthog-js')
            .then(({ default: posthog }) => {
                if (cancelled) return
                try {
                    const id = posthog.get_distinct_id?.()
                    if (id) setDistinctId(id)
                } catch {
                    // posthog not initialised (disabled dataset) — leave unset;
                    // the trace falls back to the 'anonymous' distinct id.
                }
            })
            .catch(() => {})
        return () => {
            cancelled = true
        }
    }, [])

    const onAiFeedback = useCallback((event: AiFeedbackEvent) => {
        captureClientEvent(event.name, event.properties)
    }, [])

    return (
        <InteractiveExample
            {...props}
            aiAssistant={{
                ...props.aiAssistant,
                posthogDistinctId: distinctId,
                onAiFeedback,
            }}
        />
    )
}

export default InteractiveExampleClient
