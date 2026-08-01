'use client'

import { AnimatePresence, motion } from 'framer-motion'
import { FaCheck, FaSyncAlt } from 'react-icons/fa'
import MockUploader from './MockUploader'
import { useSceneTimeline } from './useSceneTimeline'
import type { TimelineStep } from './useSceneTimeline'
import { SCENE_MEDIA } from './scene-media'
import type { QueueFile, QueueStage } from './types'

// ─────────────────────────────────────────────────────────────────────────────
// ResumeScene — the crash-safe segment: a large file is uploading when the page
// "reloads" (a reconnect overlay flickers over the whole panel chrome), then the
// upload picks up where it left off and lands with a "Resumed" tick. Crash
// recovery + resumable chunked uploads are both real upup capabilities.
// Decorative: root is aria-hidden; honours reduced-motion and the `active` gate.
// ─────────────────────────────────────────────────────────────────────────────

const RESUME_FILES: QueueFile[] = [
    {
        id: 'r1',
        name: 'beach-waves.mp4',
        ext: 'mp4',
        accent: 'blue',
        kind: 'video',
        thumb: SCENE_MEDIA.videos.beachWaves.poster,
        sizeFrom: '842 MB',
        sizeTo: '842 MB',
    },
]

interface ResumeState {
    stage: QueueStage
    reloading: boolean
    resumed: boolean
    caption: string
}

const INITIAL: ResumeState = {
    stage: 'idle',
    reloading: false,
    resumed: false,
    caption: 'Uploading a large file',
}

// Ascending by `at` (seconds). The reconnect flash lands mid-upload, then the
// transfer completes — reading as a resume rather than a restart. loop = 8.5s.
const SCRIPT: TimelineStep<ResumeState>[] = [
    { at: 0.3, set: { stage: 'filling' } },
    { at: 1.5, set: { stage: 'uploading' } },
    {
        at: 2.7,
        set: { reloading: true, caption: 'Connection dropped — reloading' },
    },
    {
        at: 3.4,
        set: {
            reloading: false,
            resumed: true,
            caption: 'Resumed right where it left off',
        },
    },
    { at: 4.4, set: { stage: 'done', caption: 'Uploaded — nothing re-sent' } },
]

interface ResumeSceneProps {
    active?: boolean
    className?: string
}

export default function ResumeScene({
    active = true,
    className = '',
}: ResumeSceneProps) {
    const { state, frozen } = useSceneTimeline<ResumeState>({
        initial: INITIAL,
        steps: SCRIPT,
        loop: 8.5,
        active,
        name: 'ResumeScene',
    })

    return (
        <div
            aria-hidden
            className={`mx-auto w-full max-w-[380px] ${className}`}
        >
            <div className="relative">
                <MockUploader
                    stage={state.stage}
                    files={RESUME_FILES}
                    reduce={frozen}
                />

                {/* Resumed tick — floats in once the transfer picks back up. */}
                <AnimatePresence>
                    {state.resumed && (
                        <motion.span
                            className="absolute right-4 top-4 z-40 inline-flex items-center gap-1 rounded-full bg-emerald-500 px-2 py-1 text-[11px] font-semibold text-white shadow-lg"
                            initial={
                                frozen ? false : { scale: 0.6, opacity: 0 }
                            }
                            animate={{ scale: 1, opacity: 1 }}
                            exit={{ opacity: 0 }}
                            transition={
                                frozen
                                    ? { duration: 0 }
                                    : {
                                          type: 'spring',
                                          stiffness: 380,
                                          damping: 20,
                                      }
                            }
                        >
                            <FaCheck className="h-2.5 w-2.5" /> Resumed
                        </motion.span>
                    )}
                </AnimatePresence>

                {/* Reconnect overlay — covers the whole panel chrome on reload. */}
                <AnimatePresence>
                    {state.reloading && (
                        <motion.div
                            className="absolute inset-0 z-50 flex flex-col items-center justify-center gap-2 rounded-2xl bg-[#0a0e1a]/85 backdrop-blur-[2px]"
                            initial={frozen ? false : { opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            transition={
                                frozen ? { duration: 0 } : { duration: 0.18 }
                            }
                        >
                            <motion.span
                                className="text-sky-400"
                                animate={
                                    frozen ? undefined : { rotate: [0, 360] }
                                }
                                transition={
                                    frozen
                                        ? undefined
                                        : {
                                              duration: 0.9,
                                              repeat: Infinity,
                                              ease: 'linear',
                                          }
                                }
                            >
                                <FaSyncAlt className="h-6 w-6" />
                            </motion.span>
                            <span className="text-xs font-medium text-gray-300">
                                Reconnecting…
                            </span>
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>

            {/* Phase caption — crossfades with the story beats. */}
            <div className="mt-4 flex h-5 items-center justify-center">
                <AnimatePresence mode="wait">
                    <motion.p
                        key={state.caption}
                        className="text-center text-sm font-medium text-gray-500 dark:text-gray-400"
                        initial={frozen ? false : { opacity: 0, y: 6 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={frozen ? { opacity: 0 } : { opacity: 0, y: -6 }}
                        transition={{ duration: 0.35 }}
                    >
                        {state.caption}
                    </motion.p>
                </AnimatePresence>
            </div>
        </div>
    )
}
