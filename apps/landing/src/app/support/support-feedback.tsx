import type { ReactNode } from 'react'

export type SupportNotice =
    { kind: 'success' | 'warning' | 'error'; text: string } | undefined

const NOTICE_BASE = 'rounded-2xl border px-4 py-3 text-sm font-medium'
// Reduced motion keeps the arrival (opacity only); the translate is dropped.
const NOTICE_MOTION =
    'motion-safe:animate-motion-enter-down motion-reduce:animate-motion-fade'

/**
 * The result notice under the form. The `role="status"` wrapper stays mounted
 * so a screen reader registers the region before its text changes (a live
 * region inserted together with its content is often not announced); an error
 * keeps its own `role="alert"` inside. The inner <p> mounts fresh for each
 * submit (the notice is cleared when one starts), which replays the enter.
 */
export function SupportNoticeRegion({ notice }: { notice?: SupportNotice }) {
    return (
        <div role="status" aria-live="polite">
            {!!notice && (
                <p
                    role={notice.kind === 'success' ? undefined : 'alert'}
                    data-testid="support-notice"
                    className={`${NOTICE_BASE} ${NOTICE_MOTION} ${
                        notice.kind === 'success'
                            ? 'border-green-500/30 bg-green-500/10 text-green-700 dark:text-green-400'
                            : 'border-red-500/30 bg-red-500/10 text-red-700 dark:text-red-400'
                    }`}
                >
                    {notice.text}
                </p>
            )}
        </div>
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
