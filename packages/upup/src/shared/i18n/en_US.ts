import type { Translations } from './types'

export const en_US: Translations = {
    // ── General ───────────────────────────────────────────────
    cancel: 'Cancel',
    done: 'Done',
    loading: 'Loading...',

    // ── Adapter names ─────────────────────────────────────────
    myDevice: 'My Device',
    googleDrive: 'Google Drive',
    oneDrive: 'OneDrive',
    dropbox: 'Dropbox',
    link: 'Link',
    camera: 'Camera',

    // ── Drop-zone / AdapterSelector ───────────────────────────
    dragFileOr: 'Drag your file or',
    dragFilesOr: 'Drag your files or',
    browseFiles: 'browse files',
    or: 'or',
    selectAFolder: 'select a folder',
    maxFileSizeAllowed_one: 'Max {{size}} {{unit}} file is allowed',
    maxFileSizeAllowed_other: 'Max {{size}} {{unit}} files are allowed',

    // ── UpupUploader (root) ───────────────────────────────────
    addDocumentsHere:
        'Add your documents here, you can upload up to {{limit}} files max',
    builtBy: 'Built by',

    // ── MainBoxHeader ─────────────────────────────────────────
    removeAllFiles: 'Remove all files',
    addingMoreFiles: 'Adding more files',
    filesSelected_one: '{{count}} file selected',
    filesSelected_other: '{{count}} files selected',
    addMore: 'Add More',

    // ── FileList ──────────────────────────────────────────────
    uploadFiles_one: 'Upload {{count}} file',
    uploadFiles_other: 'Upload {{count}} files',

    // ── FilePreview ───────────────────────────────────────────
    removeFile: 'Remove file',
    clickToPreview: 'Click to preview',
    zeroBytes: '0 Byte',
    bytes: 'Bytes',
    kb: 'KB',
    mb: 'MB',
    gb: 'GB',
    tb: 'TB',

    // ── FilePreviewPortal / Thumbnail ─────────────────────────
    previewError: 'Error: {{message}}',

    // ── DriveBrowser ──────────────────────────────────────────
    noAcceptedFilesFound: 'No accepted files found',
    selectThisFolder: 'Select this folder',
    addFiles_one: 'Add {{count}} file',
    addFiles_other: 'Add {{count}} files',

    // ── DriveBrowserHeader ────────────────────────────────────
    logOut: 'Log out',
    search: 'Search',

    // ── UrlUploader ───────────────────────────────────────────
    enterFileUrl: 'Enter file url',
    fetch: 'Fetch',

    // ── CameraUploader ────────────────────────────────────────
    capture: 'Capture',
    switchToCamera: 'switch to {{side}}',
    addImage: 'Add Image',

    // ── Camera sides ──────────────────────────────────────────
    front: 'front',
    back: 'back',

    // ── Powered by ────────────────────────────────────────────
    poweredBy: 'Powered by',
}
