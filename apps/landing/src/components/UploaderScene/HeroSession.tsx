'use client'

import { AnimatePresence, motion } from 'framer-motion'
import { SiGoogledrive } from 'react-icons/si'
import MockUploader from './MockUploader'
import MockDriveBrowser from './MockDriveBrowser'
import MockScreenShare from './MockScreenShare'
import MockAudioRecorder from './MockAudioRecorder'
import SceneTap from './SceneTap'
import { useSceneTimeline } from './useSceneTimeline'
import type { TimelineStep } from './useSceneTimeline'
import { useSceneTargets } from './scene-targets'
import type { CursorWaypoint } from './scene-targets'
import { SCENE_MEDIA } from './scene-media'
import type { DriveThumb, QueueFile, QueueStage } from './types'

// ─────────────────────────────────────────────────────────────────────────────
// HeroSession — the flagship ~24s loop: a simulated user imports two photos from
// Google Drive, captures their screen, records a voice note, then the four files
// compress on-device (one photo morphs HEIC → JPG), upload, and land with green
// ticks — then a rest beat and reset. Every beat is a REAL upup capability (drive
// import, screen capture, audio recording, compression, HEIC→JPG, progress). One
// overlay slot is shared by the drive browser / screen-share window / audio
// recorder — only one is open at a time (`overlayKind`). Decorative: the root is
// aria-hidden; honours reduced-motion and the `active` viewport gate via
// useSceneTimeline (final "all uploaded" 4-row frame).
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
    /** How many drive thumbs are selected (0–2). */
    picked: number
    /** How many queue rows are shown (0–4) — grows as each source imports. */
    fileCount: number
    /** Elapsed seconds shown on the audio recorder's timer. */
    recSeconds: number
    stage: QueueStage
    caption: string
}

// Four rows, filled in source order: two Drive photos, a screen recording, then a
// voice note. The two photos morph on compression (one is HEIC → JPG); the video
// and audio rows keep their size (sizeFrom === sizeTo — no compression morph).
const HERO_FILES: QueueFile[] = [
    {
        id: 'a',
        name: 'yosemite-valley',
        ext: 'jpg',
        accent: 'teal',
        thumb: SCENE_MEDIA.photos.yosemiteValley,
        sizeFrom: '8.4 MB',
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

// thumb-0 = yosemite-valley and thumb-1 = portrait are the scripted two picks
// (they match rows a + b); the rest fill the grid with real stock photos.
const HERO_THUMBS: DriveThumb[] = [
    { id: 't1', src: SCENE_MEDIA.photos.yosemiteValley },
    { id: 't2', src: SCENE_MEDIA.photos.portrait },
    { id: 't3', src: SCENE_MEDIA.photos.riverCanyon },
    { id: 't4', src: SCENE_MEDIA.photos.canyonCliffs },
    { id: 't5', src: SCENE_MEDIA.photos.strawberries },
    { id: 't6', src: SCENE_MEDIA.photos.puppy },
]

const HERO_PROVIDER = {
    name: 'Google Drive',
    Icon: SiGoogledrive,
    color: '#4285F4',
}

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
    caption: 'Import straight from Google Drive',
}

// Ascending by `at` (seconds). loop = 24s → ~1.8s rest on the finished frame.
// Each cursor move lands on a MEASURED target; the following click fires only
// after the near-critically-damped spring has settled (~0.6–0.9s). Targets that
// live inside an overlay (screen-stop / audio-stop) are only pointed at while
// that overlay is open — otherwise scene-targets warns + falls back to {0,0}.
const SCRIPT: TimelineStep<HeroState>[] = [
    // ── Drive: open, pick two photos, import ────────────────────────────────
    {
        at: 0.4,
        set: { cursorHidden: false, cursor: { target: 'source-google-drive' } },
    },
    { at: 1.3, set: { activeSource: 'google-drive', tapId: 1 } },
    { at: 1.7, set: { activeSource: null, overlayKind: 'drive' } },
    { at: 2.7, set: { cursor: { target: 'thumb-0' } } },
    { at: 3.4, set: { picked: 1, tapId: 2 } },
    { at: 4.0, set: { cursor: { target: 'thumb-1' } } },
    { at: 4.6, set: { picked: 2, tapId: 3 } },
    { at: 5.3, set: { cursor: { target: 'drive-add' } } },
    { at: 6.1, set: { tapId: 4 } },
    {
        at: 6.4,
        set: {
            overlayKind: null,
            stage: 'filling',
            fileCount: 2,
            cursorHidden: true,
            // Point rest: never leave the waypoint on an element that just
            // unmounted with its overlay (a stray gap re-render would warn).
            cursor: { px: 6, py: 92 },
        },
    },

    // ── Screen share: capture, watch it record, stop ────────────────────────
    {
        at: 7.4,
        set: {
            cursorHidden: false,
            cursor: { target: 'source-screen' },
            caption: 'Capture your screen',
        },
    },
    { at: 8.3, set: { activeSource: 'screen', tapId: 5 } },
    {
        at: 8.7,
        set: { activeSource: null, overlayKind: 'screen', cursorHidden: true },
    },
    {
        at: 11.2,
        set: { cursorHidden: false, cursor: { target: 'screen-stop' } },
    },
    { at: 12.0, set: { tapId: 6 } },
    {
        at: 12.3,
        set: {
            overlayKind: null,
            fileCount: 3,
            cursorHidden: true,
            cursor: { px: 6, py: 92 },
        },
    },

    // ── Audio: record a voice note, watch the timer, stop ───────────────────
    {
        at: 13.2,
        set: {
            cursorHidden: false,
            cursor: { target: 'source-audio' },
            caption: 'Record a voice note',
        },
    },
    { at: 14.1, set: { activeSource: 'audio', tapId: 7 } },
    {
        at: 14.5,
        set: {
            activeSource: null,
            overlayKind: 'audio',
            recSeconds: 0,
            cursorHidden: true,
        },
    },
    { at: 15.5, set: { recSeconds: 1 } },
    { at: 16.5, set: { recSeconds: 2 } },
    {
        at: 17.0,
        set: { cursorHidden: false, cursor: { target: 'audio-stop' } },
    },
    { at: 17.4, set: { recSeconds: 3 } },
    { at: 17.8, set: { tapId: 8 } },
    {
        at: 18.1,
        set: {
            overlayKind: null,
            fileCount: 4,
            cursorHidden: true,
            cursor: { px: 6, py: 92 },
        },
    },

    // ── Pipeline: compress on-device, upload, done ──────────────────────────
    {
        at: 18.6,
        set: {
            stage: 'compress',
            caption: 'Compressed on-device — HEIC to JPG',
        },
    },
    {
        at: 20.2,
        set: { stage: 'uploading', caption: 'Uploading to your storage' },
    },
    { at: 22.2, set: { stage: 'done', caption: 'Uploaded — all done' } },
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
        loop: 24,
        active,
        name: 'HeroSession',
    })
    const { rootRef, measure } = useSceneTargets<HTMLDivElement>()
    const { x: cursorX, y: cursorY } = measure(state.cursor)

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
        <div
            aria-hidden
            className={`mx-auto w-full max-w-[440px] ${className}`}
        >
            <div ref={rootRef} className="relative">
                <MockUploader
                    activeSource={state.activeSource}
                    stage={state.stage}
                    files={HERO_FILES.slice(0, state.fileCount)}
                    showOverlay={state.overlayKind !== null}
                    overlay={overlay}
                    bodyMinHeightClass="min-h-[252px]"
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
