import React, { useId, useState } from 'react'
import { ChevronRight } from 'lucide-react'
import type { ChatStep } from './chatSteps'

/**
 * Collapsed-by-default disclosure of what the agent did this turn. A native
 * button owns the toggle (Enter and Space for free) and points at the list
 * with aria-controls. The list stays in the DOM while collapsed, hidden, so
 * the reference always resolves.
 *
 * Quiet by design: steps are not a live region. While the turn streams, the
 * latest running step shows in the collapsed label so progress is visible
 * without opening anything; a single polite status line is written once, when
 * the turn finishes.
 */
export function StepTrail({
    steps,
    pending,
}: {
    steps: ChatStep[]
    pending: boolean
}) {
    const [open, setOpen] = useState(false)
    const listId = useId()
    const latest = steps[steps.length - 1]

    if (!latest) return null

    let label: string
    if (open) label = 'Hide steps'
    else if (pending && latest.status === 'running') label = `${latest.label}…`
    else label = `Show steps (${steps.length})`

    const failed = steps.filter(s => s.status === 'error').length
    const summary = pending
        ? ''
        : `Finished ${steps.length} ${steps.length === 1 ? 'step' : 'steps'}${
              failed ? `, ${failed} failed` : ''
          }.`

    return (
        <div className="upup-ie-ai-steps" data-open={open || undefined}>
            <button
                type="button"
                className="upup-ie-ai-steps-toggle"
                aria-expanded={open}
                aria-controls={listId}
                onClick={() => setOpen(o => !o)}
            >
                <ChevronRight
                    size={12}
                    aria-hidden="true"
                    className="upup-ie-ai-steps-chevron"
                />
                <span>{label}</span>
            </button>
            <ol
                id={listId}
                className="upup-ie-ai-steps-list upup-ie-ai-ease-block"
                hidden={!open}
            >
                {steps.map(step => (
                    <li key={step.id} data-status={step.status}>
                        {step.label}
                    </li>
                ))}
            </ol>
            <span
                role="status"
                aria-live="polite"
                className="upup-ie-ai-sr-only"
            >
                {summary}
            </span>
        </div>
    )
}
