'use client'

import { AnimatePresence, motion } from 'framer-motion'
import MockUploader from './MockUploader'
import { useSceneTimeline } from './useSceneTimeline'
import type { TimelineStep } from './useSceneTimeline'
import { FRAMEWORK_LIST } from '@/lib/frameworks'

// ─────────────────────────────────────────────────────────────────────────────
// FrameworksScene — the "same uploader, every framework" segment: the mock panel
// stays pixel-stable while a "rendered in <framework>" badge cycles through all
// six official framework logos. The stillness is the point — byte-identical DOM
// in React, Vue, Svelte, Angular, Vanilla JS, and Preact. Decorative: root is
// aria-hidden; honours reduced-motion and the `active` gate via the timeline.
// ─────────────────────────────────────────────────────────────────────────────

interface FrameworksState {
    fw: number
}

const INITIAL: FrameworksState = { fw: 0 }

// One step per framework after the first (which `initial` already shows).
// Ascending by `at` (seconds); loop = 10s leaves a short rest on the last logo.
const SCRIPT: TimelineStep<FrameworksState>[] = FRAMEWORK_LIST.slice(1).map(
    (_, i) => ({ at: 1.5 * (i + 1), set: { fw: i + 1 } }),
)

interface FrameworksSceneProps {
    active?: boolean
    className?: string
}

export default function FrameworksScene({
    active = true,
    className = '',
}: FrameworksSceneProps) {
    const { state, frozen } = useSceneTimeline<FrameworksState>({
        initial: INITIAL,
        steps: SCRIPT,
        loop: 10,
        active,
        name: 'FrameworksScene',
    })

    const fw = FRAMEWORK_LIST[state.fw]

    return (
        <div
            aria-hidden
            className={`mx-auto w-full max-w-[380px] ${className}`}
        >
            <div className="relative">
                {/* "rendered in <framework>" badge — the only thing that moves. */}
                <div className="absolute -top-3 right-4 z-40 flex h-8 items-center overflow-hidden rounded-full bg-white/90 px-3 shadow-lg ring-1 ring-black/10 dark:bg-[#0b1120]/90 dark:ring-white/15">
                    <span className="mr-1.5 text-[11px] font-medium text-gray-500 dark:text-gray-400">
                        rendered in
                    </span>
                    <span className="relative h-4 w-20">
                        <AnimatePresence mode="popLayout">
                            <motion.span
                                key={fw.id}
                                className="absolute inset-0 inline-flex items-center gap-1.5 text-xs font-semibold text-gray-900 dark:text-white"
                                initial={frozen ? false : { y: 12, opacity: 0 }}
                                animate={{ y: 0, opacity: 1 }}
                                exit={
                                    frozen ? undefined : { y: -12, opacity: 0 }
                                }
                                transition={{ duration: 0.35 }}
                            >
                                <fw.Icon
                                    className="h-3.5 w-3.5"
                                    style={{ color: fw.brand }}
                                />
                                {fw.name}
                            </motion.span>
                        </AnimatePresence>
                    </span>
                </div>

                <MockUploader stage="idle" files={[]} reduce={frozen} />
            </div>
        </div>
    )
}
