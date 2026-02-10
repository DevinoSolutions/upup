/**
 * All user-facing translatable strings in the UpupUploader component.
 *
 * Use `{{variable}}` syntax for interpolation placeholders.
 * Provide separate `_one` / `_other` keys where pluralisation is needed.
 */
export type Translations = {
    // ── General ───────────────────────────────────────────────
    cancel: string
    done: string
    loading: string

    // ── Adapter names ─────────────────────────────────────────
    myDevice: string
    googleDrive: string
    oneDrive: string
    dropbox: string
    link: string
    camera: string

    // ── Drop-zone / AdapterSelector ───────────────────────────
    /** Singular: "Drag your file or" */
    dragFileOr: string
    /** Plural: "Drag your files or" */
    dragFilesOr: string
    browseFiles: string
    or: string
    selectAFolder: string
    /** "Max {{size}} {{unit}} file is allowed" */
    maxFileSizeAllowed_one: string
    /** "Max {{size}} {{unit}} files are allowed" */
    maxFileSizeAllowed_other: string

    // ── UpupUploader (root) ───────────────────────────────────
    /** "Add your documents here, you can upload up to {{limit}} files max" */
    addDocumentsHere: string
    builtBy: string

    // ── MainBoxHeader ─────────────────────────────────────────
    removeAllFiles: string
    addingMoreFiles: string
    /** "{{count}} file selected" */
    filesSelected_one: string
    /** "{{count}} files selected" */
    filesSelected_other: string
    addMore: string

    // ── FileList ──────────────────────────────────────────────
    /** "Upload {{count}} file" */
    uploadFiles_one: string
    /** "Upload {{count}} files" */
    uploadFiles_other: string

    // ── FilePreview ───────────────────────────────────────────
    removeFile: string
    clickToPreview: string
    /** "0 Byte" */
    zeroBytes: string
    bytes: string
    kb: string
    mb: string
    gb: string
    tb: string

    // ── FilePreviewPortal / Thumbnail ─────────────────────────
    /** "Error: {{message}}" */
    previewError: string

    // ── DriveBrowser ──────────────────────────────────────────
    noAcceptedFilesFound: string
    selectThisFolder: string
    /** "Add {{count}} file" */
    addFiles_one: string
    /** "Add {{count}} files" */
    addFiles_other: string

    // ── DriveBrowserHeader ────────────────────────────────────
    logOut: string
    search: string

    // ── UrlUploader ───────────────────────────────────────────
    enterFileUrl: string
    fetch: string

    // ── CameraUploader ────────────────────────────────────────
    capture: string
    /** "switch to {{side}}" */
    switchToCamera: string
    addImage: string

    // ── Camera sides ──────────────────────────────────────────
    front: string
    back: string

    // ── Powered by ────────────────────────────────────────────
    poweredBy: string
}
