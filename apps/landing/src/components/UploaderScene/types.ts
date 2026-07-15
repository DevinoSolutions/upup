import type { IconType } from 'react-icons'
import type { AccentHue } from '@/components/ui/Card'

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
    /** Accent hue for the thumbnail tint + progress bar. */
    accent: AccentHue
    /** Size before the on-device compression step (e.g. '8.4 MB'). */
    sizeFrom: string
    /** Size after compression — the number the size text morphs to. */
    sizeTo: string
    /** When set, the type badge morphs from → to (HEIC → JPG demo). */
    convertFrom?: string
    convertTo?: string
}

/** A gradient thumbnail placeholder for the drive-browser grid. */
export interface DriveThumb {
    id: string
    /** Tailwind gradient classes, e.g. 'from-sky-400 to-teal-500'. */
    gradient: string
}

/** Provider identity for the drive-browser header (logo + name + brand colour). */
export interface DriveProvider {
    name: string
    Icon: IconType
    color: string
}
