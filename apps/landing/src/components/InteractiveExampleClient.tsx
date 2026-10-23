'use client'

import { useCallback, useEffect, useState } from 'react'
import {
    InteractiveExample,
    type InteractiveExampleProps,
    type AiFeedbackEvent,
    type AssistantErrorInfo,
} from '@useupup/interactive-example'
import { captureClientEvent } from '@/lib/analytics/capture.client'
import { reportAiFailure } from '@/lib/analytics/sentry'
import { whenPostHogReady } from '@/lib/analytics/posthog-client'

/**
 * Client wrapper that injects the client-only pieces the Ask-AI panel needs
 * into `aiAssistant`:
 *
 *   - `posthogDistinctId` — the visitor's PostHog distinct id, so an AI trace's
 *     distinct id matches whoever later rates the response.
 *   - `onAiFeedback` — the sink that forwards thumbs ratings / comments to
 *     PostHog via `posthog.capture`.
 *   - `onAssistantError` — the sink that reports a turn ending in the visible
 *     error state to Sentry (a no-op when Sentry is not initialised).
 *
 * Both live here rather than in the server prop builder because a function prop
 * can't cross the RSC boundary and `posthog.get_distinct_id()` only exists on
 * the client. Delivery goes through the shared, dataset-gated
 * `captureClientEvent` — the interactive-example package itself stays
 * PostHog-free.
 */
export function InteractiveExampleClient(props: InteractiveExampleProps) {
    const [distinctId, setDistinctId] = useState<string | undefined>(undefined)

    // The live instance arrives through the analytics registry: on the landing
    // routes PostHog boots after page load, so reading the SDK module directly
    // here could see it before init() and get no id. On a disabled dataset it
    // never arrives and the trace falls back to the 'anonymous' distinct id.
    useEffect(
        () =>
            whenPostHogReady(posthog => {
                try {
                    const id = posthog.get_distinct_id?.()
                    if (id) setDistinctId(id)
                } catch {
                    // Leave unset — same 'anonymous' fallback.
                }
            }),
        [],
    )

    const onAiFeedback = useCallback((event: AiFeedbackEvent) => {
        captureClientEvent(event.name, event.properties)
    }, [])

    const onAssistantError = useCallback((info: AssistantErrorInfo) => {
        reportAiFailure(info)
    }, [])

    return (
        <InteractiveExample
            {...props}
            aiAssistant={{
                ...props.aiAssistant,
                posthogDistinctId: distinctId,
                onAiFeedback,
                onAssistantError,
            }}
        />
    )
}

export default InteractiveExampleClient
