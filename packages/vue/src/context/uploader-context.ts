import {
    inject,
    provide,
    type ComputedRef,
    type InjectionKey,
    type Ref,
} from 'vue'
import type {
    FileSource,
    UploadFile,
    UpupThemeMode,
    ResolvedImageEditorOptions,
    FilesProgressMap,
} from '@upupjs/core'
import type {
    BaseContextUpload,
    BaseContextRuntime,
    BaseContextSource,
    BaseContextI18n,
    BaseContextFiles,
    BaseContextUploadControls,
    BaseContextView,
    BaseContextEditor,
    BaseContextTheme,
} from '@upupjs/core/internal'
import { UploadStatus } from '@upupjs/core'
import type { UploaderProps, UploaderIcons } from '../shared/types'

export { UploadStatus }

// ─── Context type shapes ───────────────────────────────────

// Reactive so upload progress / status changes reach consumers post-mount.
export type ContextUpload = Omit<
    BaseContextUpload,
    | 'uploadStatus'
    | 'uploadError'
    | 'uploadErrorCode'
    | 'totalProgress'
    | 'filesProgressMap'
    | 'uploadSpeed'
    | 'uploadEta'
    | 'uploadedBytes'
    | 'totalBytes'
> & {
    uploadStatus: ComputedRef<UploadStatus>
    uploadError: ComputedRef<string | undefined>
    uploadErrorCode: ComputedRef<string | undefined>
    totalProgress: ComputedRef<number>
    filesProgressMap: ComputedRef<FilesProgressMap>
    uploadSpeed: ComputedRef<number>
    uploadEta: ComputedRef<number>
    uploadedBytes: ComputedRef<number>
    totalBytes: ComputedRef<number>
}

export type ContextRuntime = Omit<BaseContextRuntime, 'isOnline'> & {
    inputRef: Ref<HTMLInputElement | null>
    isOnline: ComputedRef<boolean>
}

// Vue exposes activeSource as a reactive ComputedRef (React uses a plain value
// + re-render). Consumers read it via `.value` in script; templates auto-unwrap.
export type ContextSource = Omit<BaseContextSource, 'activeSource'> & {
    activeSource: ComputedRef<FileSource | undefined>
}

export type ContextI18n = BaseContextI18n

// Reactive so the file list / dropzone re-render as files are added or removed.
export type ContextFiles = Omit<BaseContextFiles, 'files'> & {
    files: ComputedRef<Map<string, UploadFile>>
}

export type ContextUploadControls = Omit<
    BaseContextUploadControls,
    'upload'
> & {
    upload: ContextUpload
}

// Reactive so view switching (add-more, grid/list) reaches consumers post-mount.
export type ContextView = Omit<BaseContextView, 'isAddingMore' | 'viewMode'> & {
    isAddingMore: ComputedRef<boolean>
    viewMode: ComputedRef<'grid' | 'list'>
}

// Reactive so opening/closing the image editor re-renders consumers.
export type ContextEditor = Omit<BaseContextEditor, 'editingFile'> & {
    editingFile: ComputedRef<UploadFile | null>
}

// Mode-driven theme fields are reactive so `themeMode:'system'` resolves live.
export type ContextTheme = Omit<BaseContextTheme, 'themeMode' | 'isDark'> & {
    themeMode: ComputedRef<Exclude<UpupThemeMode, 'system'>>
    isDark: ComputedRef<boolean>
}

// Under `exactOptionalPropertyTypes`, `Required<Pick<T, K>>` strips the `?`
// modifier but keeps the explicit `| undefined` from the widened base props.
// These fields are always assigned with defaults by the controller, so
// consumers see non-undefined values — strip both `?` and `undefined`.
type RequiredDefined<T, K extends keyof T> = {
    [P in K]-?: NonNullable<T[P]>
}

export type ContextProps = RequiredDefined<
    UploaderProps,
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
> &
    // Explicit `| undefined` (via indexed access) rather than `Pick`: under
    // `exactOptionalPropertyTypes` the controller assigns these from destructured
    // props (each `T | undefined`), so the target must accept undefined.
    {
        maxFileSize?: UploaderProps['maxFileSize']
        maxRetries?: UploaderProps['maxRetries']
        resumable?: UploaderProps['resumable']
    } & {
    allowedFileTypes: string
    limit: number
    folderUploadAllowDrop: boolean
    folderPickerButtonVisible: boolean
    multiple: boolean
    icons: Required<UploaderIcons>
    imageEditor: ResolvedImageEditorOptions
}

export interface IUploaderContext
    extends
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
const UploadControlsKey: InjectionKey<ContextUploadControls> = Symbol(
    'upup-upload-controls',
)
const ViewKey: InjectionKey<ContextView> = Symbol('upup-view')
const EditorKey: InjectionKey<ContextEditor> = Symbol('upup-editor')
const OptionsKey: InjectionKey<ContextProps> = Symbol('upup-options')
const ThemeKey: InjectionKey<ContextTheme> = Symbol('upup-theme')
const RootKey: InjectionKey<IUploaderContext> = Symbol('upup-root')

// ─── Provider function ─────────────────────────────────────

export function provideUploaderContext(value: IUploaderContext): void {
    provide(RootKey, value)
    provide(RuntimeKey, {
        core: value.core,
        orchestrator: value.orchestrator,
        mode: value.mode,
        serverUrl: value.serverUrl,
        inputRef: value.inputRef,
        openFilePicker: value.openFilePicker,
        isOnline: value.isOnline,
    })
    provide(SourceKey, {
        activeSource: value.activeSource,
        setActiveSource: value.setActiveSource,
        cloudDrives: value.cloudDrives,
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
        replaceFiles: value.replaceFiles,
        resetState: value.resetState,
        uploadFiles: value.uploadFiles,
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

export function useUploaderContext(): IUploaderContext {
    return readInjection(RootKey, 'useUploaderContext')
}
export function useUploaderRuntime(): ContextRuntime {
    return readInjection(RuntimeKey, 'useUploaderRuntime')
}
export function useUploaderSource(): ContextSource {
    return readInjection(SourceKey, 'useUploaderSource')
}
export function useUploaderI18n(): ContextI18n {
    return readInjection(I18nKey, 'useUploaderI18n')
}
export function useUploaderFiles(): ContextFiles {
    return readInjection(FilesKey, 'useUploaderFiles')
}
export function useUploaderUploadControls(): ContextUploadControls {
    return readInjection(UploadControlsKey, 'useUploaderUploadControls')
}
export function useUploaderView(): ContextView {
    return readInjection(ViewKey, 'useUploaderView')
}
export function useUploaderEditor(): ContextEditor {
    return readInjection(EditorKey, 'useUploaderEditor')
}
export function useUploaderOptions(): ContextProps {
    return readInjection(OptionsKey, 'useUploaderOptions')
}
export function useUploaderTheme(): ContextTheme {
    return readInjection(ThemeKey, 'useUploaderTheme')
}
