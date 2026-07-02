/**
 * Base context shape types shared across the framework bindings.
 *
 * Each framework package defines its own concrete context types that extend
 * these bases with framework-specific fields (e.g. React refs, Vue refs,
 * Dispatch<SetStateAction<...>> vs plain setters).
 *
 * This file intentionally uses plain function signatures for state setters
 * so both React (Dispatch<SetStateAction<T>>) and Vue ((v: T) => void) are
 * compatible supertypes.
 */

import type { FileSource } from './file-source'
import type { UploadFile } from './upload-file'
import type { UploadStatus } from './upload-status'
import type { ResolvedImageEditorOptions } from './image-editor'
import type { FilesProgressMap } from '../file-utils'
import type { Translator } from '../i18n/types'
import type { Translations } from '../i18n/ui-translations'
import type {
    UpupResolvedTheme,
    UpupThemeMode,
    UpupThemeTokens,
} from '../theme/types'
import type { InternalFlatClassNames, DeepPartialSlots } from '../theme/slots'
import type { UpupCore } from '../core'
import type { UploaderOrchestrator } from '../orchestrator/uploader-orchestrator'
import type { CloudDrivesConfig } from '../drives/configs'

// ─── Upload ───────────────────────────────────────────────────

export type BaseContextUpload = {
    uploadStatus: UploadStatus
    uploadError?: string
    totalProgress: number
    filesProgressMap: FilesProgressMap
    startUpload: () => Promise<UploadFile[] | undefined>
    retryUpload: (fileId?: string) => Promise<UploadFile[] | undefined>
    uploadSpeed: number
    uploadEta: number
    uploadedBytes: number
    totalBytes: number
}

// ─── Runtime ──────────────────────────────────────────────────
// Framework-specific: inputRef (React.RefObject vs Vue.Ref)

export type BaseContextRuntime = {
    core: UpupCore | null
    orchestrator: UploaderOrchestrator | null
    mode: 'client' | 'server'
    serverUrl?: string
    openFilePicker: () => void
    isOnline: boolean
}

// ─── Source ───────────────────────────────────────────────────

export type BaseContextSource = {
    activeSource?: FileSource
    setActiveSource: (adapter: FileSource | undefined) => void
    cloudDrives?: CloudDrivesConfig
}

// ─── I18n ─────────────────────────────────────────────────────

export type BaseContextI18n = {
    translations: Translations
    translator?: Translator
    lang: string
    dir: 'ltr' | 'rtl'
}

// ─── Files ────────────────────────────────────────────────────

export type BaseContextFiles = {
    files: Map<string, UploadFile>
    setFiles: (newFiles: File[]) => void
    replaceFiles: (files: File[] | UploadFile[]) => void
    resetState: () => void
    uploadFiles: (files: File[] | UploadFile[]) => Promise<UploadFile[] | undefined>
    handleFileRemove: (fileId: string) => void
}

// ─── Upload Controls ──────────────────────────────────────────

export type BaseContextUploadControls = {
    upload: BaseContextUpload
    handleDone: () => void
    handleCancel: () => void
    handlePause: () => void
    handleResume: () => void
}

// ─── View ─────────────────────────────────────────────────────

export type BaseContextView = {
    isAddingMore: boolean
    setIsAddingMore: (value: boolean) => void
    viewMode: 'grid' | 'list'
    setViewMode: (mode: 'grid' | 'list') => void
}

// ─── Editor ───────────────────────────────────────────────────

export type BaseContextEditor = {
    editingFile: UploadFile | null
    openImageEditor: (file: UploadFile) => void
    closeImageEditor: () => void
    saveImageEdit: (editedImageData: string, mimeType?: string) => void
    replaceFile: (fileId: string, newFile: UploadFile) => void
}

// ─── Theme ────────────────────────────────────────────────────

type BaseResolvedTheme = Omit<UpupResolvedTheme, 'mode'> & {
    mode: Exclude<UpupThemeMode, 'system'>
}

export type BaseContextTheme = {
    themeMode: Exclude<UpupThemeMode, 'system'>
    isDark: boolean
    tokens: UpupThemeTokens
    resolved: BaseResolvedTheme
    slotOverrides: InternalFlatClassNames
    slots: DeepPartialSlots
}
