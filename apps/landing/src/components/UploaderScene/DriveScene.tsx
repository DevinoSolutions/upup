'use client'

import { useEffect, useRef, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { SiGoogledrive, SiDropbox, SiBox } from 'react-icons/si'
import { GrOnedrive } from 'react-icons/gr'
import MockUploader from './MockUploader'
import MockDriveBrowser from './MockDriveBrowser'
import SceneTap from './SceneTap'
import { useSceneTimeline } from './useSceneTimeline'
import type { TimelineStep } from './useSceneTimeline'
import { useSceneTargets } from './scene-targets'
import type { CursorWaypoint } from './scene-targets'
import type { DriveProvider, DriveThumb, QueueFile, QueueStage } from './types'

// ─────────────────────────────────────────────────────────────────────────────
// DriveScene — the cloud-drive segment of the hero movie, on its own: a user
// opens a drive, browses a photo grid, picks three, and imports them into the
// queue. The provider CYCLES between loops (Google Drive → OneDrive → Dropbox →
// Box), so one row demonstrates all four real drive integrations in turn — the
// source chip and browser header follow the active provider. Every beat is a
// real upup capability. Decorative: root is aria-hidden; honours reduced-motion
// and the `active` viewport gate via useSceneTimeline.
// ─────────────────────────────────────────────────────────────────────────────

interface CyclingProvider extends DriveProvider {
    /** Source-chip id in MockUploader's row (kebab-case wire form). */
    id: string
}

const DRIVE_PROVIDERS: CyclingProvider[] = [
    {
        id: 'google-drive',
        name: 'Google Drive',
        Icon: SiGoogledrive,
        color: '#4285F4',
    },
    { id: 'one-drive', name: 'OneDrive', Icon: GrOnedrive, color: '#0078D4' },
    { id: 'dropbox', name: 'Dropbox', Icon: SiDropbox, color: '#0061FF' },
    { id: 'box', name: 'Box', Icon: SiBox, color: '#0061D5' },
]

const DRIVE_FILES: QueueFile[] = [
    {
        id: 'd1',
        name: 'harbour-dawn',
        ext: 'jpg',
        accent: 'teal',
        sizeFrom: '7.2 MB',
        sizeTo: '1.8 MB',
    },
    {
        id: 'd2',
        name: 'rooftops',
        ext: 'jpg',
        accent: 'violet',
        sizeFrom: '5.4 MB',
        sizeTo: '1.5 MB',
    },
    {
        id: 'd3',
        name: 'market-stall',
        ext: 'jpg',
        accent: 'amber',
        sizeFrom: '6.8 MB',
        sizeTo: '2.0 MB',
    },
]

const DRIVE_THUMBS: DriveThumb[] = [
    { id: 'g1', gradient: 'from-sky-400 to-blue-600' },
    { id: 'g2', gradient: 'from-amber-300 to-orange-500' },
    { id: 'g3', gradient: 'from-emerald-300 to-teal-600' },
    { id: 'g4', gradient: 'from-violet-400 to-fuchsia-600' },
    { id: 'g5', gradient: 'from-rose-400 to-pink-600' },
    { id: 'g6', gradient: 'from-cyan-300 to-indigo-500' },
]

interface DriveState {
    cursor: CursorWaypoint
    cursorHidden: boolean
    tapId: number
    activeSource: string | null
    browserOpen: boolean
    picked: number
    stage: QueueStage
}

const INITIAL: DriveState = {
    cursor: { px: 6, py: 92 },
    cursorHidden: true,
    tapId: 0,
    activeSource: null,
    browserOpen: false,
    picked: 0,
    stage: 'idle',
}

interface DriveSceneProps {
    /** Viewport gate from the parent; false freezes the final frame. */
    active?: boolean
    className?: string
}

export default function DriveScene({
    active = true,
    className = '',
}: DriveSceneProps) {
    const [providerIdx, setProviderIdx] = useState(0)
    const provider = DRIVE_PROVIDERS[providerIdx]

    // Ascending by `at` (seconds). loop = 11s → ~1.8s rest on the filled queue.
    // Cursor moves land on measured targets and each click fires after the
    // spring settles; the three picks visit the three thumbs that get selected.
    const script: TimelineStep<DriveState>[] = [
        {
            at: 0.4,
            set: {
                cursorHidden: false,
                cursor: { target: `source-${provider.id}` },
            },
        },
        { at: 1.4, set: { activeSource: provider.id, tapId: 1 } },
        {
            at: 1.8,
            set: { activeSource: null, browserOpen: true },
        },
        { at: 2.8, set: { cursor: { target: 'thumb-0' } } },
        { at: 3.4, set: { picked: 1, tapId: 2 } },
        { at: 4.0, set: { cursor: { target: 'thumb-1' } } },
        { at: 4.6, set: { picked: 2, tapId: 3 } },
        { at: 5.2, set: { cursor: { target: 'thumb-2' } } },
        { at: 5.8, set: { picked: 3, tapId: 4 } },
        { at: 6.5, set: { cursor: { target: 'drive-add' } } },
        { at: 7.2, set: { tapId: 5 } },
        {
            at: 7.5,
            set: {
                browserOpen: false,
                stage: 'filling',
                cursorHidden: true,
            },
        },
        { at: 8.5, set: { stage: 'uploading' } },
        { at: 10.0, set: { stage: 'done' } },
    ]

    const { state, phase, frozen } = useSceneTimeline<DriveState>({
        initial: INITIAL,
        steps: script,
        loop: 11,
        active,
        name: 'DriveScene',
    })

    // Advance the provider once per completed loop. The engine seeds `phase`
    // with the final-frame value (script.length), so we ignore the opening
    // len→0 settle and only count a wrap after genuine forward progress
    // (`armed`).
    const prevPhase = useRef(script.length)
    const armed = useRef(false)
    useEffect(() => {
        if (phase > prevPhase.current) {
            armed.current = true
        } else if (phase < prevPhase.current && armed.current) {
            armed.current = false
            setProviderIdx(i => (i + 1) % DRIVE_PROVIDERS.length)
        }
        prevPhase.current = phase
    }, [phase])

    const { rootRef, measure } = useSceneTargets<HTMLDivElement>()
    const { x: cursorX, y: cursorY } = measure(state.cursor)

    return (
        <div
            aria-hidden
            className={`mx-auto w-full max-w-[380px] ${className}`}
        >
            <div ref={rootRef} className="relative">
                <MockUploader
                    activeSource={state.activeSource}
                    stage={state.stage}
                    files={DRIVE_FILES}
                    showBrowser={state.browserOpen}
                    reduce={frozen}
                    browser={
                        <MockDriveBrowser
                            provider={provider}
                            thumbs={DRIVE_THUMBS}
                            selectedCount={state.picked}
                            reduce={frozen}
                        />
                    }
                />
                <SceneTap
                    x={cursorX}
                    y={cursorY}
                    tapId={state.tapId}
                    hidden={state.cursorHidden}
                    reduce={frozen}
                />
            </div>

            {/* Provider caption — reinforces which drive is on stage this loop. */}
            <div className="mt-4 flex h-5 items-center justify-center">
                <AnimatePresence mode="wait">
                    <motion.p
                        key={provider.name}
                        className="flex items-center gap-1.5 text-center text-sm font-medium text-gray-500 dark:text-gray-400"
                        initial={frozen ? false : { opacity: 0, y: 6 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={frozen ? { opacity: 0 } : { opacity: 0, y: -6 }}
                        transition={{ duration: 0.35 }}
                    >
                        <provider.Icon
                            className="h-3.5 w-3.5"
                            style={{ color: provider.color }}
                        />
                        Import straight from {provider.name}
                    </motion.p>
                </AnimatePresence>
            </div>
        </div>
    )
}
