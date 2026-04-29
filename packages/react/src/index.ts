'use client'

// ── Core component + ref ─────────────────────────────────
export {
    default as UpupUploader,
    type UpupUploaderRef,
} from './upup-uploader'

// ── Headless hook (v2) ───────────────────────────────────
export { useUpupUpload, type UseUpupUploadReturn } from './use-upup-upload'
export { useIsClient } from './use-is-client'

// ── Enums ────────────────────────────────────────────────
export { UploadAdapter, UpupProvider } from './shared/types'
export { FileSource } from '@upup/shared'
/** v2 alias for UpupProvider */
export { UpupProvider as StorageProvider } from './shared/types'

// ── v1 Types (backward compat) ──────────────────────────
export type {
    FileWithParams,
    FileWithProgress,
    GoogleDriveConfigs,
    OneDriveConfigs,
    DropboxConfigs,
    ImageEditorOptions,
    ResumableUploadOptions,
    Translations,
    UploadSource,
    UpupUploaderProps,
    UpupUploaderPropsIcons,
} from './shared/types'

// ── v2 Type aliases ─────────────────────────────────────
export type {
    FileWithParams as UploadFile,
    FileWithProgress as UploadFileWithProgress,
} from './shared/types'

// ── v2 re-exports from @upup/shared + @upup/core ───────
export type { UploadStatus, UpupThemeSlots, DeepPartialSlots, UpupSlotPath } from '@upup/shared'
export { UpupCore, type CoreOptions } from '@upup/core'

// ── Sub-components (v1 names) ───────────────────────────
export { default as AdapterSelector } from './components/AdapterSelector'
export { default as AdapterView } from './components/AdapterView'
export { default as CameraUploader } from './components/CameraUploader'
export { default as BoxUploader } from './components/BoxUploader'
export { default as DropboxUploader } from './components/DropboxUploader'
export { default as FileList } from './components/FileList'
export { default as FilePreview } from './components/FilePreview'
export { default as GoogleDriveUploader } from './components/GoogleDriveUploader'
export { default as MainBox } from './components/MainBox'
export { default as OneDriveUploader } from './components/OneDriveUploader'
export { default as UrlUploader } from './components/UrlUploader'

// ── v2 component name aliases ───────────────────────────
export { default as SourceSelector } from './components/AdapterSelector'
export { default as SourceView } from './components/AdapterView'
export { default as DropZone } from './components/MainBox'

// ── Prop getters (v2 headless) ──────────────────────────
export { createPropGetters } from './prop-getters'

// ── Context hook (for custom sub-components) ────────────
export { useRootContext, useRootContext as useUploaderContext } from './context/RootContext'

// ── Utilities ───────────────────────────────────────────
export { cn } from './lib/tailwind'

// ── Brand icons (authentic colours, matches uploader adapter buttons) ──
export {
    MyDeviceIcon,
    BoxIcon,
    DropBoxIcon,
    GoogleDriveIcon,
    OneDriveIcon,
    LinkIcon,
    CameraIcon,
    AudioIcon,
    ScreenCastIcon,
} from './components/Icons'

// ── i18n ─────────────────────────────────────────────────
export { en_US } from './shared/i18n'

// ── Accept presets ──────────────────────────────────────
export { ACCEPT_PRESETS, resolveAccept } from './shared/lib/acceptPresets'
export type { AcceptPreset, AcceptPresetDefinition } from './shared/lib/acceptPresets'

// ── Theme ────────────────────────────────────────────────
export { UpupThemeProvider } from './theme'

// ── Slot recipes (tailwind-variants) ────────────────────
export {
    createRecipe,
    progressBarRecipe,
    fileListRecipe,
    filePreviewRecipe,
    adapterSelectorRecipe,
    mainBoxRecipe,
    adapterViewRecipe,
    urlUploaderRecipe,
    driveBrowserRecipe,
    cameraUploaderRecipe,
    fileItemRecipe,
} from './recipes'
export type {
    ProgressBarSlots,
    FileListSlots,
    FilePreviewSlots,
    AdapterSelectorSlots,
    MainBoxSlots,
    AdapterViewSlots,
    UrlUploaderSlots,
    DriveBrowserSlots,
    CameraUploaderSlots,
    FileItemSlots,
} from './recipes'
