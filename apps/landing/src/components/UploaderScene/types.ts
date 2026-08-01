import type { IconType } from 'react-icons'

/** Accent hue for a mock file's progress bar. Scene-local: the ONE place the
 *  site still uses per-item hues (row thumbnails are real stock media now; the
 *  surviving product-demo gradient is MockUploader's panel chrome). */
export type AccentHue = 'blue' | 'teal' | 'violet' | 'amber' | 'green' | 'pink'

// ─────────────────────────────────────────────────────────────────────────────
// Shared shapes for the UploaderScene kit — a marketing recreation of the real
// @upupjs/react uploader (panel chrome, source row, drive browser, file queue)
// driven by a declarative timeline. Every visual moment maps to a REAL upup
// capability; the only fiction is illustrative size numbers.
// ─────────────────────────────────────────────────────────────────────────────

/** The lifecycle a queued file walks through as the scene plays. */
export type QueueStage = 'idle' | 'filling' | 'compress' | 'uploading' | 'done'

/** A source chip in the panel's source row (device / link / camera / drives …). */
export interface SourceDef {
    id: string
    name: string
    Icon: IconType
    /** Brand / semantic colour for the glyph. */
    color: string
}

/** One file row in the mock queue. */
export interface QueueFile {
    id: string
    name: string
    /** File extension shown as a small type badge (e.g. 'jpg'). */
    ext: string
    /** Accent hue for the progress bar. */
    accent: AccentHue
    /** Row thumbnail. Image/video rows point at a real stock image (a video row
     *  uses its poster frame); audio rows omit it and render a mic tile. */
    thumb?: string
    /** File kind — drives the row thumbnail treatment. Defaults to 'image'. */
    kind?: 'image' | 'video' | 'audio'
    /** Size before the on-device compression step (e.g. '8.4 MB'). */
    sizeFrom: string
    /** Size after compression — the number the size text morphs to. */
    sizeTo: string
    /** When set, the type badge morphs from → to (HEIC → JPG demo). */
    convertFrom?: string
    convertTo?: string
}

/** A real-media thumbnail for the drive-browser grid. A plain image tile carries
 *  only `src`; a video tile adds `video` (its clip + poster + duration badge). */
export interface DriveThumb {
    id: string
    /** Stock image shown in the tile (the poster frame for a video tile). */
    src: string
    /** When set, the tile plays this muted looping clip instead of the image. */
    video?: {
        src: string
        poster: string
        /** Duration badge text, e.g. '0:12'. */
        duration: string
    }
}

/** Provider identity for the drive-browser header (logo + name + brand colour). */
export interface DriveProvider {
    name: string
    Icon: IconType
    color: string
}
