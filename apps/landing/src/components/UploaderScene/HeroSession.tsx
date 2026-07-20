'use client'

import { useCallback, useMemo } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { SiGoogledrive } from 'react-icons/si'
import MockUploader from './MockUploader'
import MockDriveBrowser from './MockDriveBrowser'
import MockScreenShare from './MockScreenShare'
import MockAudioRecorder from './MockAudioRecorder'
import SceneTap from './SceneTap'
import DragGhost from './DragGhost'
import BeatChips, { type BeatChip } from './BeatChips'
import { useSceneTimeline } from './useSceneTimeline'
import type { TimelineStep } from './useSceneTimeline'
import { useSceneTargets } from './scene-targets'
import type { CursorWaypoint } from './scene-targets'
import { SCENE_MEDIA } from './scene-media'
import type { DriveThumb, QueueFile, QueueStage } from './types'

// ─────────────────────────────────────────────────────────────────────────────
// HeroSession — the flagship ~34s loop. A simulated user drags a photo straight
// onto the panel, drops a whole folder, imports one more from Google Drive,
// captures their screen, records a voice note, then the six files compress
// on-device (one photo morphs HEIC → JPG), upload, and land with green ticks —
// then a rest beat and reset. Every beat is a REAL upup capability. Two pointers
// drive it: SceneTap (the finger for source taps / overlay controls) and DragGhost
// (the thing being dragged for the drag-drop / folder beats). One overlay slot is
// shared by the drive browser / screen-share window / audio recorder (`overlayKind`,
// one open at a time). BeatChips under the animation seek the loop to any beat.
// Decorative: the scene root is aria-hidden (the chips are NOT — they're real
// buttons, rendered as its sibling); honours reduced-motion and the `active`
// viewport gate via useSceneTimeline (final "all uploaded" 6-row frame).
// ─────────────────────────────────────────────────────────────────────────────

interface HeroState {
    /** Cursor destination — a measured mock element, or an off-panel rest. */
    cursor: CursorWaypoint
    cursorHidden: boolean
    /** Bumped on each tap to fire the press pulse + ripple. */
    tapId: number
    activeSource: string | null
    /** Which overlay is slid over the panel body (one at a time). */
    overlayKind: null | 'drive' | 'screen' | 'audio'
    /** How many drive thumbs are selected (0–1 now — a single drive pick). */
    picked: number
    /** How many queue rows are shown (0–6) — grows as each source imports. */
    fileCount: number
    /** Elapsed seconds shown on the audio recorder's timer. */
    recSeconds: number
    stage: QueueStage
    caption: string
    /** The in-flight drag card's kind, or null when nothing is being dragged. */
    ghost: 'file' | 'folder' | null
    /** DragGhost destination — measured panel-body while dragging, else a point. */
    ghostWp: CursorWaypoint
    /** Bumped on each drop so the landing pulse replays. */
    dropId: number
    /** Shows the panel's dashed drag veil while a ghost hovers it. */
    dragOver: boolean
}

// Six rows, filled in arrival order: a dropped photo, two from a dropped folder
// (the `assets/` name prefix tells the folder story in the row itself), one Drive
// import, a screen recording, then a voice note. The images morph on compression
// (IMG_0421 is HEIC → JPG); the video and audio rows keep their size.
const HERO_FILES: QueueFile[] = [
    {
        id: 'dd',
        name: 'street-market',
        ext: 'jpg',
        accent: 'teal',
        thumb: SCENE_MEDIA.photos.streetMarket,
        sizeFrom: '5.6 MB',
        sizeTo: '1.7 MB',
    },
    {
        id: 'f1',
        name: 'assets/river-canyon',
        ext: 'jpg',
        accent: 'green',
        thumb: SCENE_MEDIA.photos.riverCanyon,
        sizeFrom: '7.4 MB',
        sizeTo: '2.1 MB',
    },
    {
        id: 'f2',
        name: 'assets/canyon-cliffs',
        ext: 'jpg',
        accent: 'pink',
        thumb: SCENE_MEDIA.photos.canyonCliffs,
        sizeFrom: '6.9 MB',
        sizeTo: '1.9 MB',
    },
    {
        id: 'b',
        name: 'IMG_0421',
        ext: 'jpg',
        accent: 'amber',
        thumb: SCENE_MEDIA.photos.portrait,
        sizeFrom: '6.1 MB',
        sizeTo: '2.3 MB',
        convertFrom: '.heic',
        convertTo: '.jpg',
    },
    {
        id: 'c',
        name: 'screen-rec',
        ext: 'mp4',
        accent: 'violet',
        kind: 'video',
        thumb: SCENE_MEDIA.videos.screenShare.poster,
        sizeFrom: '18.4 MB',
        sizeTo: '18.4 MB',
    },
    {
        id: 'd',
        name: 'voice-note',
        ext: 'webm',
        accent: 'blue',
        kind: 'audio',
        sizeFrom: '1.2 MB',
        sizeTo: '1.2 MB',
    },
]

// thumb-0 = the portrait is the scripted single drive pick (it matches row `b`,
// IMG_0421); the rest fill the grid with real stock photos.
const HERO_THUMBS: DriveThumb[] = [
    { id: 't1', src: SCENE_MEDIA.photos.portrait },
    { id: 't2', src: SCENE_MEDIA.photos.riverCanyon },
    { id: 't3', src: SCENE_MEDIA.photos.canyonCliffs },
    { id: 't4', src: SCENE_MEDIA.photos.streetMarket },
    { id: 't5', src: SCENE_MEDIA.photos.strawberries },
    { id: 't6', src: SCENE_MEDIA.photos.puppy },
]

const HERO_PROVIDER = {
    name: 'Google Drive',
    Icon: SiGoogledrive,
    color: '#4285F4',
}

// Ghost rest points (raw percent of the scene root, per the point-rest rule): the
// off-panel start it glides IN from, and the panel-centre point it hides ON at a
// drop (coincident with the measured panel-body so the landing pulse plays in
// place, yet a point so no measured target is left as the waypoint when hidden).
const GHOST_START: CursorWaypoint = { px: -6, py: 52 }
const GHOST_DROP: CursorWaypoint = { px: 50, py: 56 }

const INITIAL: HeroState = {
    cursor: { px: 6, py: 92 },
    cursorHidden: true,
    tapId: 0,
    activeSource: null,
    overlayKind: null,
    picked: 0,
    fileCount: 0,
    recSeconds: 0,
    stage: 'idle',
    caption: 'Drag & drop, straight onto the panel',
    ghost: null,
    ghostWp: GHOST_START,
    dropId: 0,
    dragOver: false,
}

// Ascending by `at` (seconds). loop = 34s → ~1.8s rest on the finished frame.
// Each cursor/ghost move lands on a MEASURED target; the following tap/drop fires
// only after the near-critically-damped spring has settled (~0.8s glide). Targets
// that live inside an overlay (screen-stop / audio-stop) are only pointed at while
// that overlay is open; every overlay-close AND every ghost-hide rests its
// waypoint on a POINT, never a measured target that just unmounted.
const SCRIPT: TimelineStep<HeroState>[] = [
    // ── Beat 1 · Drag & drop — glide a photo onto the panel and drop it ──────
    { at: 0.4, set: { ghost: 'file', ghostWp: GHOST_START } },
    { at: 1.1, set: { ghostWp: { target: 'panel-body' }, dragOver: true } },
    {
        at: 3.0,
        set: {
            ghost: null,
            dropId: 1,
            dragOver: false,
            ghostWp: GHOST_DROP,
            stage: 'filling',
            fileCount: 1,
        },
    },
    // Re-arm off-panel while hidden, ready for the folder glide.
    { at: 4.2, set: { ghostWp: GHOST_START } },

    // ── Beat 2 · Folder — drop a whole folder (two rows pop) ─────────────────
    { at: 5.5, set: { ghost: 'folder', caption: 'Drop a whole folder' } },
    { at: 6.2, set: { ghostWp: { target: 'panel-body' }, dragOver: true } },
    {
        at: 8.5,
        set: {
            ghost: null,
            dropId: 2,
            dragOver: false,
            ghostWp: GHOST_DROP,
            fileCount: 3,
        },
    },

    // ── Beat 3 · Drive — open, pick ONE photo, import ────────────────────────
    {
        at: 10.5,
        set: {
            cursorHidden: false,
            cursor: { target: 'source-google-drive' },
            caption: 'Import straight from Google Drive',
        },
    },
    { at: 11.4, set: { activeSource: 'google-drive', tapId: 1 } },
    { at: 11.8, set: { activeSource: null, overlayKind: 'drive' } },
    { at: 12.8, set: { cursor: { target: 'thumb-0' } } },
    { at: 13.5, set: { picked: 1, tapId: 2 } },
    { at: 14.2, set: { cursor: { target: 'drive-add' } } },
    { at: 15.0, set: { tapId: 3 } },
    {
        at: 15.3,
        set: {
            overlayKind: null,
            fileCount: 4,
            cursorHidden: true,
            // Point rest: never leave the waypoint on an element that just
            // unmounted with its overlay (a stray gap re-render would warn).
            cursor: { px: 6, py: 92 },
        },
    },

    // ── Beat 4 · Screen share — capture, watch it record, stop ───────────────
    {
        at: 17.0,
        set: {
            cursorHidden: false,
            cursor: { target: 'source-screen' },
            caption: 'Capture your screen',
        },
    },
    { at: 17.9, set: { activeSource: 'screen', tapId: 4 } },
    {
        at: 18.3,
        set: { activeSource: null, overlayKind: 'screen', cursorHidden: true },
    },
    {
        at: 20.8,
        set: { cursorHidden: false, cursor: { target: 'screen-stop' } },
    },
    { at: 21.6, set: { tapId: 5 } },
    {
        at: 21.9,
        set: {
            overlayKind: null,
            fileCount: 5,
            cursorHidden: true,
            cursor: { px: 6, py: 92 },
        },
    },

    // ── Beat 5 · Voice — record a note, watch the timer, stop ────────────────
    {
        at: 23.0,
        set: {
            cursorHidden: false,
            cursor: { target: 'source-audio' },
            caption: 'Record a voice note',
        },
    },
    { at: 23.9, set: { activeSource: 'audio', tapId: 6 } },
    {
        at: 24.3,
        set: {
            activeSource: null,
            overlayKind: 'audio',
            recSeconds: 0,
            cursorHidden: true,
        },
    },
    { at: 25.3, set: { recSeconds: 1 } },
    { at: 26.3, set: { recSeconds: 2 } },
    {
        at: 26.8,
        set: { cursorHidden: false, cursor: { target: 'audio-stop' } },
    },
    { at: 27.2, set: { recSeconds: 3 } },
    { at: 27.6, set: { tapId: 7 } },
    {
        at: 27.9,
        set: {
            overlayKind: null,
            fileCount: 6,
            cursorHidden: true,
            cursor: { px: 6, py: 92 },
        },
    },

    // ── Beat 6 · Pipeline — compress on-device, upload, done ─────────────────
    {
        at: 28.5,
        set: {
            stage: 'compress',
            caption: 'Compressed on-device — HEIC to JPG',
        },
    },
    {
        at: 30.2,
        set: { stage: 'uploading', caption: 'Uploading to your storage' },
    },
    { at: 32.2, set: { stage: 'done', caption: 'Uploaded — all done' } },
]

// The clickable segment index. `seekTo` is each beat's start — an overlay-closed
// timestamp, per the seek authoring rule. `firstAt` is the `at` of the beat's
// first script step; its index marks when the beat becomes the active chip.
interface Beat extends BeatChip {
    firstAt: number
}

const BEATS: Beat[] = [
    { id: 'drag', label: 'Drag & drop', seekTo: 0, firstAt: 0.4 },
    { id: 'folder', label: 'Folder', seekTo: 5.5, firstAt: 5.5 },
    { id: 'drive', label: 'Drive', seekTo: 10.5, firstAt: 10.5 },
    {
        id: 'screen',
        label: 'Screen share',
        seekTo: 17,
        firstAt: 17,
        popular: true,
    },
    { id: 'voice', label: 'Voice', seekTo: 23, firstAt: 23 },
]

// Index of each beat's first step. The beat is the active chip once that step has
// been applied (phase > index); phase 0 / reset → no chip active.
const BEAT_FIRST_INDEX = BEATS.map(b =>
    SCRIPT.findIndex(s => s.at === b.firstAt),
)

interface HeroSessionProps {
    /** Viewport gate from the parent; false freezes the final frame. */
    active?: boolean
    className?: string
}

export default function HeroSession({
    active = true,
    className = '',
}: HeroSessionProps) {
    const { state, phase, frozen, seek } = useSceneTimeline<HeroState>({
        initial: INITIAL,
        steps: SCRIPT,
        loop: 34,
        active,
        name: 'HeroSession',
    })
    const { rootRef, measure } = useSceneTargets<HTMLDivElement>()
    const { x: cursorX, y: cursorY } = measure(state.cursor)
    const { x: ghostX, y: ghostY } = measure(state.ghostWp)

    const activeBeatId = useMemo(() => {
        let active: string | null = null
        BEATS.forEach((beat, i) => {
            const idx = BEAT_FIRST_INDEX[i]
            if (idx >= 0 && phase > idx) active = beat.id
        })
        return active
    }, [phase])

    const handleSelect = useCallback((seekTo: number) => seek(seekTo), [seek])

    // One overlay slot, one open at a time. `null` → nothing rendered (the
    // MockUploader gate hides it and plays the previous overlay's exit).
    const overlay =
        state.overlayKind === 'drive' ? (
            <MockDriveBrowser
                provider={HERO_PROVIDER}
                thumbs={HERO_THUMBS}
                selectedCount={state.picked}
                reduce={frozen}
            />
        ) : state.overlayKind === 'screen' ? (
            <MockScreenShare reduce={frozen} />
        ) : state.overlayKind === 'audio' ? (
            <MockAudioRecorder seconds={state.recSeconds} reduce={frozen} />
        ) : null

    return (
        <div className={`mx-auto w-full max-w-[440px] ${className}`}>
            <div aria-hidden>
                <div ref={rootRef} className="relative">
                    <MockUploader
                        activeSource={state.activeSource}
                        stage={state.stage}
                        files={HERO_FILES.slice(0, state.fileCount)}
                        showOverlay={state.overlayKind !== null}
                        overlay={overlay}
                        dragOver={state.dragOver}
                        bodyMinHeightClass="min-h-[384px]"
                        reduce={frozen}
                    />
                    <DragGhost
                        kind={state.ghost ?? 'file'}
                        x={ghostX}
                        y={ghostY}
                        visible={state.ghost !== null}
                        dropId={state.dropId}
                        label={
                            state.ghost === 'folder'
                                ? 'assets/'
                                : 'street-market.jpg'
                        }
                        thumb={SCENE_MEDIA.photos.streetMarket}
                        reduce={frozen}
                    />
                    <SceneTap
                        x={cursorX}
                        y={cursorY}
                        tapId={state.tapId}
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
                            exit={
                                frozen ? { opacity: 0 } : { opacity: 0, y: -6 }
                            }
                            transition={{ duration: 0.35 }}
                        >
                            {state.caption}
                        </motion.p>
                    </AnimatePresence>
                </div>
            </div>

            {/* Real controls — OUTSIDE the aria-hidden scene root. */}
            <BeatChips
                beats={BEATS}
                activeId={activeBeatId}
                frozen={frozen}
                onSelect={handleSelect}
            />
        </div>
    )
}
