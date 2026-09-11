import { FileSource } from '../types/file-source'
import { ACCEPT_PRESETS } from '../utils/accept-presets'

/**
 * Hides DEFAULT capture sources whose output can never satisfy the configured
 * accept list (#340). A host that sets `allowedFileTypes: 'application/pdf'`
 * still got camera/microphone/screen chips in the default source set, and every
 * recording they produced was rejected on add.
 *
 * Two hard rules:
 *  - Only the DEFAULT set is filtered. An explicit `sources` array is always
 *    honored verbatim.
 *  - `local` and `url` are never filtered (their output is host-chosen, not
 *    produced by us), and cloud drives are unaffected.
 *
 * The matcher FAILS OPEN: a source is dropped only when we can prove no accept
 * entry could ever match one of its outputs.
 */

type MediaFamily = 'image' | 'audio' | 'video'

/**
 * The MIME types each capture source can actually emit, derived from the code
 * that builds the File — not from guesses:
 *
 *  - `camera` → `image/jpeg`. React passes `screenshotFormat="image/jpeg"` to
 *    react-webcam; vue/svelte/angular/vanilla all call
 *    `canvas.toDataURL('image/jpeg')` and stamp `type: 'image/jpeg'`. No camera
 *    path records video. `image/png` is included because `toDataURL` falls back
 *    to PNG when the requested format is unsupported (HTML spec).
 *  - `microphone` → `new MediaRecorder(stream)` with no `mimeType`, read back as
 *    `recorder.mimeType || 'audio/webm'`: webm on Chromium/Firefox, mp4 on
 *    Safari, and React's own filename branch also admits `.ogg`.
 *  - `screen` → `new MediaRecorder(displayStream)` read back as
 *    `recorder.mimeType || 'video/webm'`: webm on Chromium/Firefox, mp4 on
 *    Safari. The screen source has no still-image path.
 */
const CAPTURE_SOURCE_OUTPUT_MIMES: Partial<
    Record<FileSource, readonly string[]>
> = {
    [FileSource.CAMERA]: ['image/jpeg', 'image/png'],
    [FileSource.MICROPHONE]: ['audio/webm', 'audio/ogg', 'audio/mp4'],
    [FileSource.SCREEN]: ['video/webm', 'video/mp4'],
}

/**
 * Extensions we can classify into media families. An extension is a weaker
 * signal than a MIME type (one container holds several codecs), so extension
 * entries are matched at top-level-type granularity, never on the subtype.
 */
const MEDIA_EXTENSION_FAMILIES: Record<string, readonly MediaFamily[]> = {
    '.jpg': ['image'],
    '.jpeg': ['image'],
    '.jfif': ['image'],
    '.png': ['image'],
    '.apng': ['image'],
    '.webp': ['image'],
    '.gif': ['image'],
    '.bmp': ['image'],
    '.tif': ['image'],
    '.tiff': ['image'],
    '.heic': ['image'],
    '.heif': ['image'],
    '.avif': ['image'],
    '.svg': ['image'],
    '.cr2': ['image'],
    '.cr3': ['image'],
    '.nef': ['image'],
    '.arw': ['image'],
    '.dng': ['image'],
    '.orf': ['image'],
    '.rw2': ['image'],
    '.raf': ['image'],
    '.raw': ['image'],
    '.mp3': ['audio'],
    '.wav': ['audio'],
    '.m4a': ['audio'],
    '.aac': ['audio'],
    '.flac': ['audio'],
    '.oga': ['audio'],
    '.opus': ['audio'],
    '.weba': ['audio'],
    '.mov': ['video'],
    '.mkv': ['video'],
    '.avi': ['video'],
    '.m4v': ['video'],
    '.mpg': ['video'],
    '.mpeg': ['video'],
    '.ogv': ['video'],
    // Ambiguous containers: both an audio-only and a video track are legal.
    '.webm': ['audio', 'video'],
    '.mp4': ['audio', 'video'],
    '.ogg': ['audio', 'video'],
    '.3gp': ['audio', 'video'],
}

/**
 * Extensions we know are NOT capture output. Every extension any accept preset
 * mentions counts as known (so `allowedFileTypes: '3d'` or `'code'` filters
 * instead of failing open), plus the everyday document/archive extensions the
 * presets happen to express as MIME types.
 */
const KNOWN_NON_MEDIA_EXTENSIONS: ReadonlySet<string> = new Set([
    ...Object.values(ACCEPT_PRESETS)
        .flatMap(preset => preset.accept.split(','))
        .map(token => token.trim().toLowerCase())
        .filter(token => token.startsWith('.')),
    '.pdf',
    '.doc',
    '.docx',
    '.odt',
    '.xls',
    '.xlsx',
    '.ods',
    '.ppt',
    '.pptx',
    '.odp',
    '.txt',
    '.rtf',
    '.csv',
    '.json',
    '.xml',
    '.html',
    '.htm',
    '.css',
    '.js',
    '.mjs',
    '.cjs',
    '.zip',
    '.rar',
    '.7z',
    '.tar',
    '.gz',
    '.epub',
])

type AcceptEntry =
    | { kind: 'any' }
    | { kind: 'mime'; value: string }
    | { kind: 'wildcard'; prefix: string }
    | { kind: 'extension'; families: readonly MediaFamily[] }
    | { kind: 'unknown' }

function classifyAcceptEntry(raw: string): AcceptEntry {
    const entry = raw.trim().toLowerCase()
    if (entry === '*' || entry === '*/*' || entry === '*.*')
        return { kind: 'any' }
    if (entry.endsWith('/*'))
        return { kind: 'wildcard', prefix: entry.slice(0, -1) }
    if (entry.startsWith('.')) {
        const families = MEDIA_EXTENSION_FAMILIES[entry]
        if (families) return { kind: 'extension', families }
        if (KNOWN_NON_MEDIA_EXTENSIONS.has(entry))
            return { kind: 'extension', families: [] }
        return { kind: 'unknown' }
    }
    if (entry.includes('/')) return { kind: 'mime', value: entry }
    return { kind: 'unknown' }
}

function familyOf(mime: string): MediaFamily | undefined {
    const top = mime.split('/')[0]
    return top === 'image' || top === 'audio' || top === 'video'
        ? top
        : undefined
}

function couldMatch(
    entry: AcceptEntry,
    outputMimes: readonly string[],
): boolean {
    switch (entry.kind) {
        case 'any':
        case 'unknown':
            return true
        case 'mime':
            return outputMimes.includes(entry.value)
        case 'wildcard':
            return outputMimes.some(mime => mime.startsWith(entry.prefix))
        case 'extension':
            return outputMimes.some(mime => {
                const family = familyOf(mime)
                return family !== undefined && entry.families.includes(family)
            })
    }
}

/**
 * Returns `sources` with every capture source whose declared output can never
 * satisfy `accept` removed. Call it ONLY for the default source set.
 */
export function filterDefaultCaptureSources(
    sources: readonly FileSource[],
    accept: string,
): FileSource[] {
    const entries = accept
        .split(',')
        .map(token => token.trim())
        .filter(Boolean)
        .map(classifyAcceptEntry)

    // No constraint at all, or an entry we cannot reason about anywhere in the
    // list: never hide a source we cannot prove useless.
    if (entries.length === 0 || entries.some(entry => entry.kind === 'any'))
        return [...sources]
    if (entries.some(entry => entry.kind === 'unknown')) return [...sources]

    const kept: FileSource[] = []
    const dropped: FileSource[] = []
    for (const source of sources) {
        const outputMimes = CAPTURE_SOURCE_OUTPUT_MIMES[source]
        if (!outputMimes) {
            kept.push(source)
            continue
        }
        if (entries.some(entry => couldMatch(entry, outputMimes))) {
            kept.push(source)
        } else {
            dropped.push(source)
        }
    }

    if (
        dropped.length > 0 &&
        typeof process !== 'undefined' &&
        process.env.NODE_ENV !== 'production'
    ) {
        for (const source of dropped) {
            console.warn(
                `[upup] hiding the default "${source}" source: nothing it can produce (${(
                    CAPTURE_SOURCE_OUTPUT_MIMES[source] ?? []
                ).join(
                    ', ',
                )}) matches allowedFileTypes "${accept}". Pass an explicit \`sources\` array to keep it.`,
            )
        }
    }

    return kept
}
