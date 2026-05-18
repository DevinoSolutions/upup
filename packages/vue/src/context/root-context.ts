import { inject, provide, type InjectionKey, type Ref } from 'vue'
import type {
    FileSource,
    FilesProgressMap,
    InternalFlatClassNames,
    DeepPartialSlots,
    Translations,
    Translator,
    UpupCore,
    UploadFile,
    UpupResolvedTheme,
    UpupThemeMode,
    UpupThemeTokens,
} from '@upup/core'
import { UploadStatus } from '@upup/core'
import type { MaxFileSizeObject, ResumableUploadOptions } from '@upup/core'
import type { ResolvedImageEditorOptions } from '@upup/core'
import type {
    UpupUploaderProps,
    UpupUploaderPropsIcons,
} from '../shared/types'

export { UploadStatus }

// ─── Context type shapes ───────────────────────────────────

export type ContextUpload = {
    uploadStatus: UploadStatus
    uploadError?: string
    totalProgress: number
    filesProgressMap: FilesProgressMap
    proceedUpload: () => Promise<UploadFile[] | undefined>
    retryUpload: (fileId?: string) => Promise<UploadFile[] | undefined>
    uploadSpeed: number
    uploadEta: number
    uploadedBytes: number
    totalBytes: number
}

export type ContextRuntime = {
    core: UpupCore | null
    mode: 'client' | 'server'
    serverUrl?: string
    inputRef: Ref<HTMLInputElement | null>
    openFilePicker: () => void
    isOnline: boolean
}

export type ContextSource = {
    activeAdapter?: FileSource
    setActiveAdapter: (adapter: FileSource | undefined) => void
    oneDriveConfigs?: Record<string, string | undefined>
    googleDriveConfigs?: Record<string, string>
    dropboxConfigs?: Record<string, string | undefined>
    boxConfigs?: Record<string, string | undefined>
}

export type ContextI18n = {
    translations: Translations
    translator?: Translator
    lang: string
    dir: 'ltr' | 'rtl'
}

export type ContextFiles = {
    files: Map<string, UploadFile>
    setFiles: (newFiles: File[]) => void
    dynamicallyReplaceFiles: (files: File[] | UploadFile[]) => void
    resetState: () => void
    dynamicUpload: (files: File[] | UploadFile[]) => Promise<UploadFile[] | undefined>
    handleFileRemove: (fileId: string) => void
}

export type ContextUploadControls = {
    upload: ContextUpload
    handleDone: () => void
    handleCancel: () => void
    handlePause: () => void
    handleResume: () => void
}

export type ContextView = {
    isAddingMore: boolean
    setIsAddingMore: (value: boolean) => void
    viewMode: 'grid' | 'list'
    setViewMode: (mode: 'grid' | 'list') => void
}

export type ContextEditor = {
    editingFile: UploadFile | null
    openImageEditor: (file: UploadFile) => void
    closeImageEditor: () => void
    saveImageEdit: (editedImageData: string, mimeType?: string) => void
    replaceFile: (fileId: string, newFile: UploadFile) => void
}

type VueResolvedTheme = Omit<UpupResolvedTheme, 'mode'> & {
    mode: Exclude<UpupThemeMode, 'system'>
}

export type ContextTheme = {
    themeMode: Exclude<UpupThemeMode, 'system'>
    isDark: boolean
    tokens: UpupThemeTokens
    resolved: VueResolvedTheme
    slotOverrides: InternalFlatClassNames
    slots: DeepPartialSlots
}

export type ContextProps = Required<
    Pick<
        UpupUploaderProps,
        | 'sources'
        | 'isProcessing'
        | 'allowPreview'
        | 'mini'
        | 'onFileClick'
        | 'onIntegrationClick'
        | 'onFilesDragOver'
        | 'onFilesDragLeave'
        | 'onFilesDrop'
        | 'onWarn'
        | 'enablePaste'
        | 'onError'
        | 'showBranding'
        | 'className'
        | 'style'
        | 'disableDragDrop'
    >
> &
    Pick<UpupUploaderProps, 'maxFileSize' | 'maxRetries' | 'resumable'> & {
        allowedFileTypes: string
        limit: number
        folderUploadAllowDrop: boolean
        folderPickerButtonVisible: boolean
        multiple: boolean
        icons: Required<UpupUploaderPropsIcons>
        imageEditor: ResolvedImageEditorOptions
    }

export interface IRootContext extends
    ContextRuntime,
    ContextSource,
    ContextI18n,
    ContextFiles,
    ContextUploadControls,
    ContextView,
    ContextEditor {
    props: ContextProps
    theme: ContextTheme
}

// ─── Injection keys ────────────────────────────────────────

const RuntimeKey: InjectionKey<ContextRuntime> = Symbol('upup-runtime')
const SourceKey: InjectionKey<ContextSource> = Symbol('upup-source')
const I18nKey: InjectionKey<ContextI18n> = Symbol('upup-i18n')
const FilesKey: InjectionKey<ContextFiles> = Symbol('upup-files')
const UploadControlsKey: InjectionKey<ContextUploadControls> = Symbol('upup-upload-controls')
const ViewKey: InjectionKey<ContextView> = Symbol('upup-view')
const EditorKey: InjectionKey<ContextEditor> = Symbol('upup-editor')
const OptionsKey: InjectionKey<ContextProps> = Symbol('upup-options')
const ThemeKey: InjectionKey<ContextTheme> = Symbol('upup-theme')
const RootKey: InjectionKey<IRootContext> = Symbol('upup-root')

// ─── Provider function ─────────────────────────────────────

export function provideRootContext(value: IRootContext) {
    provide(RootKey, value)
    provide(RuntimeKey, {
        core: value.core,
        mode: value.mode,
        serverUrl: value.serverUrl,
        inputRef: value.inputRef,
        openFilePicker: value.openFilePicker,
        isOnline: value.isOnline,
    })
    provide(SourceKey, {
        activeAdapter: value.activeAdapter,
        setActiveAdapter: value.setActiveAdapter,
        oneDriveConfigs: value.oneDriveConfigs,
        googleDriveConfigs: value.googleDriveConfigs,
        dropboxConfigs: value.dropboxConfigs,
        boxConfigs: value.boxConfigs,
    })
    provide(I18nKey, {
        translations: value.translations,
        translator: value.translator,
        lang: value.lang,
        dir: value.dir,
    })
    provide(FilesKey, {
        files: value.files,
        setFiles: value.setFiles,
        dynamicallyReplaceFiles: value.dynamicallyReplaceFiles,
        resetState: value.resetState,
        dynamicUpload: value.dynamicUpload,
        handleFileRemove: value.handleFileRemove,
    })
    provide(UploadControlsKey, {
        upload: value.upload,
        handleDone: value.handleDone,
        handleCancel: value.handleCancel,
        handlePause: value.handlePause,
        handleResume: value.handleResume,
    })
    provide(ViewKey, {
        isAddingMore: value.isAddingMore,
        setIsAddingMore: value.setIsAddingMore,
        viewMode: value.viewMode,
        setViewMode: value.setViewMode,
    })
    provide(EditorKey, {
        editingFile: value.editingFile,
        openImageEditor: value.openImageEditor,
        closeImageEditor: value.closeImageEditor,
        saveImageEdit: value.saveImageEdit,
        replaceFile: value.replaceFile,
    })
    provide(OptionsKey, value.props)
    provide(ThemeKey, value.theme)
}

// ─── Consumer composables ──────────────────────────────────

function readInjection<T>(key: InjectionKey<T>, name: string): T {
    const value = inject(key)
    if (!value) throw new Error(`${name} must be used inside <UpupUploader />`)
    return value
}

export function useRootContext() { return readInjection(RootKey, 'useRootContext') }
export function useUploaderRuntime() { return readInjection(RuntimeKey, 'useUploaderRuntime') }
export function useUploaderSource() { return readInjection(SourceKey, 'useUploaderSource') }
export function useUploaderI18n() { return readInjection(I18nKey, 'useUploaderI18n') }
export function useUploaderFiles() { return readInjection(FilesKey, 'useUploaderFiles') }
export function useUploaderUploadControls() { return readInjection(UploadControlsKey, 'useUploaderUploadControls') }
export function useUploaderView() { return readInjection(ViewKey, 'useUploaderView') }
export function useUploaderEditor() { return readInjection(EditorKey, 'useUploaderEditor') }
export function useUploaderOptions() { return readInjection(OptionsKey, 'useUploaderOptions') }
export function useUploaderTheme() { return readInjection(ThemeKey, 'useUploaderTheme') }
