'use client'

import { useId, useState } from 'react'
import { ChevronRight } from 'lucide-react'
import type { ChatStep } from '@useupup/interactive-example/ai/chatSteps'

/** The one-line "Finished 2 steps, 1 failed." summary for the live region. */
export function stepSummary(steps: ChatStep[]): string {
    if (steps.length === 0) return ''
    const failed = steps.filter(s => s.status === 'error').length
    return `${steps.length} ${steps.length === 1 ? 'step' : 'steps'}${
        failed ? `, ${failed} failed` : ''
    }`
}

// Collapsed-by-default disclosure of what the assistant did this turn, in
// plain words ("Searched the docs for 'presign'"). A native <button> owns the
// toggle (Enter and Space for free, focus stays on it) and points at the list
// with aria-expanded/aria-controls. The list stays in the DOM while collapsed,
// hidden, so the reference always resolves.
//
// Quiet by design: the steps are not a live region. While the turn streams the
// latest running step shows in the collapsed label so progress is visible
// without opening anything; the drawer announces the end of the turn once.
export function DocsAskAiStepTrail({
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

    // The name does not flip with the state: aria-expanded alone says open or
    // closed, so a screen reader never hears it twice. While a step runs the
    // button names it instead, so progress shows without opening anything.
    const label =
        pending && latest.status === 'running'
            ? `${latest.label}…`
            : `Steps (${steps.length})`

    return (
        <div
            data-testid="docs-ask-ai-steps"
            className="text-xs text-gray-500 dark:text-gray-400"
        >
            <button
                type="button"
                aria-expanded={open}
                aria-controls={listId}
                onClick={() => setOpen(o => !o)}
                className="-ml-0.5 inline-flex max-w-full items-center gap-1 rounded-md py-0.5 pl-0.5 pr-1.5 text-left transition-colors hover:text-gray-800 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600 dark:hover:text-gray-100 dark:focus-visible:outline-blue-400"
            >
                <ChevronRight
                    aria-hidden="true"
                    className={`h-3 w-3 shrink-0 motion-safe:transition-transform motion-safe:duration-fast motion-safe:ease-motion-out ${
                        open ? 'rotate-90' : ''
                    }`}
                />
                <span className="truncate">{label}</span>
            </button>
            <ol
                id={listId}
                hidden={!open}
                className="mt-1 space-y-0.5 border-l border-black/10 pl-3 motion-safe:animate-motion-fade dark:border-white/10"
            >
                {steps.map(step => (
                    <li
                        key={step.id}
                        data-status={step.status}
                        className={
                            step.status === 'error'
                                ? 'text-amber-700 dark:text-amber-400'
                                : undefined
                        }
                    >
                        {step.label}
                    </li>
                ))}
            </ol>
        </div>
    )
}
