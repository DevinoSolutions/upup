import type { ReactNode } from 'react'

export type SupportNotice =
    { kind: 'success' | 'warning' | 'error'; text: string } | undefined

const NOTICE_BASE = 'rounded-2xl border px-4 py-3 text-sm font-medium'
// Reduced motion keeps the arrival (opacity only); the translate is dropped.
const NOTICE_MOTION =
    'motion-safe:animate-motion-enter-down motion-reduce:animate-motion-fade'

// Each region is a flex item of the form's `gap-6` column. While it is empty it
// has zero height but flex gap still applies on both sides, so `empty:-mt-6`
// cancels the extra gap and the idle form keeps its original spacing.
const REGION_IDLE_GAP = 'empty:-mt-6'

/**
 * The result notice under the form. Two always-mounted sibling live regions,
 * a polite `status` for success and an assertive `alert` for warning/error:
 * a screen reader registers a region before its text changes (one inserted
 * together with its content is often not announced), and the two are never
 * nested (nested live regions can double-announce). The <p> mounts fresh for
 * each submit (the notice is cleared when one starts), which replays the enter.
 */
export function SupportNoticeRegion({ notice }: { notice?: SupportNotice }) {
    const success = notice?.kind === 'success' ? notice : undefined
    const problem = notice && notice.kind !== 'success' ? notice : undefined
    return (
        <>
            <div role="status" className={REGION_IDLE_GAP}>
                {success && (
                    <p
                        data-testid="support-notice"
                        className={`${NOTICE_BASE} ${NOTICE_MOTION} border-green-500/30 bg-green-500/10 text-green-700 dark:text-green-400`}
                    >
                        {success.text}
                    </p>
                )}
            </div>
            <div role="alert" className={REGION_IDLE_GAP}>
                {problem && (
                    <p
                        data-testid="support-notice"
                        className={`${NOTICE_BASE} ${NOTICE_MOTION} border-red-500/30 bg-red-500/10 text-red-700 dark:text-red-400`}
                    >
                        {problem.text}
                    </p>
                )}
            </div>
        </>
    )
}

const LABEL_FADE = 'transition-opacity duration-base ease-motion-out'

/**
 * Both submit labels live in the button at once and cross-fade, so the width
 * is set by the longer one and `Sending…` never shifts the layout. The inactive
 * label is hidden from assistive tech, keeping the accessible name single.
 */
export function SubmitLabel({
    submitting,
}: {
    submitting: boolean
}): ReactNode {
    return (
        <>
            <span
                aria-hidden={submitting ? 'true' : undefined}
                className={`${LABEL_FADE} ${submitting ? 'opacity-0' : 'opacity-100'}`}
            >
                Send request
            </span>
            <span
                aria-hidden={submitting ? undefined : 'true'}
                className={`absolute inset-0 flex items-center justify-center ${LABEL_FADE} ${
                    submitting ? 'opacity-100' : 'opacity-0'
                }`}
            >
                Sending…
            </span>
        </>
    )
}
