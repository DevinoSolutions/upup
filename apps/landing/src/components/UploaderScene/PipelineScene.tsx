'use client'

import { motion } from 'framer-motion'
import MockUploader from './MockUploader'
import { useSceneTimeline } from './useSceneTimeline'
import type { TimelineStep } from './useSceneTimeline'
import { SCENE_MEDIA } from './scene-media'
import type { QueueFile, QueueStage } from './types'

// ─────────────────────────────────────────────────────────────────────────────
// PipelineScene — the "fast by default" segment: three queued photos compress
// on-device (size text shrinks, one morphs .heic → .jpg) and upload, while a
// worker lane below shows the main thread staying flat as the worker blocks
// pulse — the real off-main-thread compression story. Decorative: root is
// aria-hidden; honours reduced-motion and the `active` gate via the timeline.
// ─────────────────────────────────────────────────────────────────────────────

const PIPELINE_FILES: QueueFile[] = [
    {
        id: 'p1',
        name: 'IMG_2287',
        ext: 'jpg',
        accent: 'amber',
        thumb: SCENE_MEDIA.photos.canyonCliffs,
        sizeFrom: '8.4 MB',
        sizeTo: '1.9 MB',
        convertFrom: '.heic',
        convertTo: '.jpg',
    },
    {
        id: 'p2',
        name: 'pink-blossoms',
        ext: 'png',
        accent: 'violet',
        thumb: SCENE_MEDIA.photos.pinkBlossoms,
        sizeFrom: '5.2 MB',
        sizeTo: '1.3 MB',
    },
    {
        id: 'p3',
        name: 'street-market',
        ext: 'jpg',
        accent: 'teal',
        thumb: SCENE_MEDIA.photos.streetMarket,
        sizeFrom: '6.7 MB',
        sizeTo: '1.6 MB',
    },
]

interface PipelineState {
    stage: QueueStage
}

const INITIAL: PipelineState = { stage: 'idle' }

// Ascending by `at` (seconds). loop = 9.5s → a short rest on the finished queue.
const SCRIPT: TimelineStep<PipelineState>[] = [
    { at: 0.3, set: { stage: 'filling' } },
    { at: 2.0, set: { stage: 'compress' } },
    { at: 4.6, set: { stage: 'uploading' } },
    { at: 6.6, set: { stage: 'done' } },
]

interface PipelineSceneProps {
    active?: boolean
    className?: string
}

export default function PipelineScene({
    active = true,
    className = '',
}: PipelineSceneProps) {
    const { state, frozen } = useSceneTimeline<PipelineState>({
        initial: INITIAL,
        steps: SCRIPT,
        loop: 9.5,
        active,
        name: 'PipelineScene',
    })

    return (
        <div
            aria-hidden
            className={`mx-auto w-full max-w-[380px] ${className}`}
        >
            <MockUploader
                stage={state.stage}
                files={PIPELINE_FILES}
                reduce={frozen}
            />
            <WorkerLane reduce={frozen} />
        </div>
    )
}

// The thread-lane strip: a flat "main thread" line (never blocks) beside a
// "worker" lane whose blocks pulse — where the compression actually runs.
function WorkerLane({ reduce }: { reduce: boolean }) {
    return (
        <div className="mt-4 flex items-center justify-center gap-6 rounded-xl border border-black/[0.06] bg-black/[0.02] px-4 py-3 dark:border-white/[0.08] dark:bg-white/[0.03]">
            <div className="flex flex-col gap-1">
                <span className="text-[10px] font-medium text-gray-500 dark:text-gray-400">
                    main thread
                </span>
                <div className="h-3 w-28 rounded-full bg-emerald-500/15">
                    <div className="h-full w-full rounded-full bg-gradient-to-r from-emerald-400/50 to-emerald-400/50" />
                </div>
                <span className="text-[9px] text-emerald-600 dark:text-emerald-400">
                    stays responsive
                </span>
            </div>
            <div className="flex flex-col gap-1">
                <span className="text-[10px] font-medium text-gray-500 dark:text-gray-400">
                    worker
                </span>
                <div className="flex h-3 w-28 items-center gap-1">
                    {[0, 1, 2, 3, 4].map(i => (
                        <motion.span
                            key={i}
                            className="h-full flex-1 rounded-sm bg-sky-400/80"
                            style={{ transformOrigin: 'center' }}
                            animate={
                                reduce
                                    ? undefined
                                    : {
                                          scaleY: [0.4, 1, 0.4],
                                          opacity: [0.5, 1, 0.5],
                                      }
                            }
                            transition={
                                reduce
                                    ? undefined
                                    : {
                                          duration: 1.4,
                                          repeat: Infinity,
                                          ease: 'easeInOut',
                                          delay: i * 0.15,
                                      }
                            }
                        />
                    ))}
                </div>
                <span className="text-[9px] text-sky-600 dark:text-sky-400">
                    compressing off-thread
                </span>
            </div>
        </div>
    )
}
