'use client'

import { AnimatePresence, motion } from 'framer-motion'
import { SiGoogledrive } from 'react-icons/si'
import MockUploader from './MockUploader'
import MockDriveBrowser from './MockDriveBrowser'
import SceneCursor from './SceneCursor'
import { useSceneTimeline } from './useSceneTimeline'
import type { TimelineStep } from './useSceneTimeline'
import { useSceneTargets } from './scene-targets'
import type { CursorWaypoint } from './scene-targets'
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
    /** Cursor destination — a measured mock element, or an off-panel rest. */
    cursor: CursorWaypoint
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
    cursor: { px: 6, py: 92 },
    cursorHidden: true,
    clickId: 0,
    activeSource: null,
    browserOpen: false,
    picked: 0,
    stage: 'idle',
    caption: 'Import straight from Google Drive',
}

// Ascending by `at` (seconds). loop = 16s → ~3s rest on the finished state.
// Each cursor move lands on a MEASURED target; the following click fires only
// after the near-critically-damped spring has settled (~0.7–0.9s for the long
// opening moves, ~0.6s for the short thumb-to-thumb hops). The three picks visit
// the three thumbs that actually get selected (thumb-0/1/2), so the pointer is
// always on the photo it selects.
const SCRIPT: TimelineStep<HeroState>[] = [
    {
        at: 0.4,
        set: { cursorHidden: false, cursor: { target: 'source-google-drive' } },
    },
    { at: 1.3, set: { activeSource: 'google-drive', clickId: 1 } },
    { at: 1.7, set: { activeSource: null, browserOpen: true } },
    { at: 2.7, set: { cursor: { target: 'thumb-0' } } },
    { at: 3.4, set: { picked: 1, clickId: 2 } },
    { at: 4.0, set: { cursor: { target: 'thumb-1' } } },
    { at: 4.6, set: { picked: 2, clickId: 3 } },
    { at: 5.2, set: { cursor: { target: 'thumb-2' } } },
    { at: 5.8, set: { picked: 3, clickId: 4 } },
    { at: 6.5, set: { cursor: { target: 'drive-add' } } },
    { at: 7.2, set: { clickId: 5 } },
    {
        at: 7.5,
        set: { browserOpen: false, stage: 'filling', cursorHidden: true },
    },
    {
        at: 8.8,
        set: {
            stage: 'compress',
            caption: 'Compressed on-device — HEIC to JPG',
        },
    },
    {
        at: 10.8,
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
        name: 'HeroSession',
    })
    const { rootRef, measure } = useSceneTargets<HTMLDivElement>()
    const { x: cursorX, y: cursorY } = measure(state.cursor)

    return (
        <div
            aria-hidden
            className={`mx-auto w-full max-w-[440px] ${className}`}
        >
            <div ref={rootRef} className="relative">
                <MockUploader
                    activeSource={state.activeSource}
                    stage={state.stage}
                    files={HERO_FILES}
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
