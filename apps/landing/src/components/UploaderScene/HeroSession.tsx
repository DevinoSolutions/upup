'use client'

import { useMemo } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { SiGoogledrive } from 'react-icons/si'
import MockUploader from './MockUploader'
import MockDriveBrowser from './MockDriveBrowser'
import SceneCursor from './SceneCursor'
import { useElementSize, useSceneTimeline } from './useSceneTimeline'
import type { TimelineStep } from './useSceneTimeline'
import type { DriveThumb, QueueFile, QueueStage } from './types'

// ─────────────────────────────────────────────────────────────────────────────
// HeroSession — the flagship ~16s loop: a simulated user imports 3 photos from
// Google Drive, they fly into the queue, compress on-device (one morphs
// HEIC → JPG), upload, and land with green ticks — then a rest beat and reset.
// Every beat is a REAL upup capability (drive import, compression, HEIC→JPG,
// progress). Decorative: the root is aria-hidden; honours reduced-motion and the
// `active` viewport gate via useSceneTimeline (final "all uploaded" frame).
// ─────────────────────────────────────────────────────────────────────────────

interface HeroState {
    /** Cursor position as a percentage of the panel box. */
    cx: number
    cy: number
    cursorHidden: boolean
    /** Bumped on each click to fire the cursor ripple. */
    clickId: number
    activeSource: string | null
    browserOpen: boolean
    /** How many drive thumbs are selected (0–3). */
    picked: number
    stage: QueueStage
    caption: string
}

const HERO_FILES: QueueFile[] = [
    {
        id: 'a',
        name: 'seaside-cliff',
        ext: 'jpg',
        accent: 'teal',
        sizeFrom: '8.4 MB',
        sizeTo: '1.9 MB',
    },
    {
        id: 'b',
        name: 'IMG_0421',
        ext: 'jpg',
        accent: 'amber',
        sizeFrom: '6.1 MB',
        sizeTo: '2.3 MB',
        convertFrom: '.heic',
        convertTo: '.jpg',
    },
    {
        id: 'c',
        name: 'team-portrait',
        ext: 'png',
        accent: 'violet',
        sizeFrom: '4.2 MB',
        sizeTo: '1.1 MB',
    },
]

const HERO_THUMBS: DriveThumb[] = [
    { id: 't1', gradient: 'from-sky-400 to-blue-600' },
    { id: 't2', gradient: 'from-amber-300 to-orange-500' },
    { id: 't3', gradient: 'from-emerald-300 to-teal-600' },
    { id: 't4', gradient: 'from-violet-400 to-fuchsia-600' },
    { id: 't5', gradient: 'from-rose-400 to-pink-600' },
    { id: 't6', gradient: 'from-cyan-300 to-indigo-500' },
]

const HERO_PROVIDER = {
    name: 'Google Drive',
    Icon: SiGoogledrive,
    color: '#4285F4',
}

const INITIAL: HeroState = {
    cx: 8,
    cy: 94,
    cursorHidden: true,
    clickId: 0,
    activeSource: null,
    browserOpen: false,
    picked: 0,
    stage: 'idle',
    caption: 'Import straight from Google Drive',
}

// Ascending by `at` (seconds). loop = 16s → ~3s rest on the finished state.
const SCRIPT: TimelineStep<HeroState>[] = [
    { at: 0.4, set: { cursorHidden: false, cx: 57, cy: 16 } },
    { at: 1.9, set: { activeSource: 'google-drive', clickId: 1 } },
    { at: 2.3, set: { activeSource: null, browserOpen: true } },
    { at: 3.1, set: { cx: 24, cy: 44 } },
    { at: 3.6, set: { picked: 1, clickId: 2 } },
    { at: 4.2, set: { cx: 62, cy: 44 } },
    { at: 4.7, set: { picked: 2, clickId: 3 } },
    { at: 5.3, set: { cx: 43, cy: 63 } },
    { at: 5.8, set: { picked: 3, clickId: 4 } },
    { at: 6.5, set: { cx: 24, cy: 85 } },
    { at: 7.0, set: { clickId: 5 } },
    {
        at: 7.3,
        set: { browserOpen: false, stage: 'filling', cursorHidden: true },
    },
    {
        at: 8.6,
        set: {
            stage: 'compress',
            caption: 'Compressed on-device — HEIC to JPG',
        },
    },
    {
        at: 10.6,
        set: { stage: 'uploading', caption: 'Uploading to your storage' },
    },
    { at: 13.0, set: { stage: 'done', caption: 'Uploaded — all done' } },
]

interface HeroSessionProps {
    /** Viewport gate from the parent; false freezes the final frame. */
    active?: boolean
    className?: string
}

export default function HeroSession({
    active = true,
    className = '',
}: HeroSessionProps) {
    const { state, frozen } = useSceneTimeline<HeroState>({
        initial: INITIAL,
        steps: SCRIPT,
        loop: 16,
        active,
    })
    const [panelRef, { width, height }] = useElementSize<HTMLDivElement>()

    const files = useMemo(() => HERO_FILES.slice(0, 3), [])

    const cursorX = (state.cx / 100) * width
    const cursorY = (state.cy / 100) * height

    return (
        <div
            aria-hidden
            className={`mx-auto w-full max-w-[440px] ${className}`}
        >
            <div ref={panelRef} className="relative">
                <MockUploader
                    activeSource={state.activeSource}
                    stage={state.stage}
                    files={files}
                    showBrowser={state.browserOpen}
                    reduce={frozen}
                    browser={
                        <MockDriveBrowser
                            provider={HERO_PROVIDER}
                            thumbs={HERO_THUMBS}
                            selectedCount={state.picked}
                            reduce={frozen}
                        />
                    }
                />
                <SceneCursor
                    x={cursorX}
                    y={cursorY}
                    clickId={state.clickId}
                    hidden={state.cursorHidden}
                    reduce={frozen}
                />
            </div>

            {/* Phase caption — crossfades with the story beats */}
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
