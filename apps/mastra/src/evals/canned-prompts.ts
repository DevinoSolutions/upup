/**
 * Canned eval prompts for the playground agent.
 *
 * Each entry is a "user input → expected effect" pair. We don't assert exact
 * patch equality (the agent has freedom in *how* it expresses an intent), so
 * we check membership: the patch MUST contain the keys listed in `mustSet`,
 * and MUST NOT touch any keys in `mustNotTouch`.
 *
 * Add to this list as you find prompts the agent gets wrong in the wild —
 * each one becomes a regression test.
 */

export type EvalCase = {
    name: string
    prompt: string
    /** Keys (top-level) that the patch must include. */
    mustSet: string[]
    /** Keys (top-level) that the patch must NOT include. */
    mustNotTouch?: string[]
    /** Optional value-level checks (top-level keys only). */
    mustEqual?: Partial<Record<string, unknown>>
}

export const EVAL_CASES: readonly EvalCase[] = [
    // ── File restrictions ────────────────────────────────────
    {
        name: 'images-only-10mb',
        prompt: 'Photos only, max 10MB',
        mustSet: ['allowedFileTypes', 'maxFileSize'],
        mustNotTouch: ['maxFiles', 'sources', 'theme'],
    },
    {
        name: 'videos-only',
        prompt: 'I only want users to upload videos',
        mustSet: ['allowedFileTypes'],
    },
    {
        name: 'audio-files',
        prompt: 'Allow audio files',
        mustSet: ['allowedFileTypes'],
    },
    {
        name: 'documents',
        prompt: 'Documents only please',
        mustSet: ['allowedFileTypes'],
    },
    {
        name: 'small-files-only',
        prompt: 'Reject anything bigger than 2 MB',
        mustSet: ['maxFileSize'],
    },
    {
        name: 'min-size',
        prompt: 'Files have to be at least 1 KB',
        mustSet: ['minFileSize'],
    },
    {
        name: 'limit-to-three',
        prompt: 'Maximum 3 files at a time',
        mustSet: ['maxFiles'],
    },
    {
        name: 'retries',
        prompt: 'Retry up to 5 times on failure',
        mustSet: ['maxRetries'],
    },

    // ── Sources ──────────────────────────────────────────────
    {
        name: 'add-google-drive-dropbox',
        prompt: 'Add Google Drive and Dropbox',
        mustSet: ['sources'],
    },
    {
        name: 'add-onedrive',
        prompt: 'Let people pull from OneDrive',
        mustSet: ['sources'],
    },
    {
        name: 'camera-only',
        prompt: 'Camera capture only, no uploads from device',
        mustSet: ['sources'],
    },
    {
        name: 'add-link-source',
        prompt: 'Allow uploading via URL',
        mustSet: ['sources'],
    },

    // ── Server mode ──────────────────────────────────────────
    {
        name: 'server-mode',
        prompt: 'Switch to server mode pointing at /api/upup',
        mustSet: ['mode', 'serverUrl'],
    },

    // ── Theme ───────────────────────────────────────────────
    {
        name: 'dark-mode',
        prompt: 'Make it dark',
        mustSet: ['theme'],
    },
    {
        name: 'rounded-corners',
        prompt: 'I want fully rounded corners',
        mustSet: ['theme'],
    },
    {
        name: 'red-accent',
        prompt: 'Change the primary color to red',
        mustSet: ['theme'],
    },

    // ── Image editor ─────────────────────────────────────────
    {
        name: 'enable-image-editor-modal',
        prompt: 'Open the image editor automatically when uploading a single image',
        mustSet: ['imageEditor'],
    },

    // ── Resumable ────────────────────────────────────────────
    {
        name: 'tus-resumable',
        prompt: 'Use tus for resumable uploads',
        mustSet: ['resumable'],
    },

    // ── Branding + locale ────────────────────────────────────
    {
        name: 'hide-branding',
        prompt: 'Hide the upup branding',
        mustSet: ['showBranding'],
        mustEqual: { showBranding: false },
    },
    {
        name: 'french-locale',
        prompt: 'Display the UI in French',
        mustSet: ['locale'],
    },
] as const
