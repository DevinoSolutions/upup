import { getContext, setContext } from 'svelte'
import type { Readable } from 'svelte/store'
import type {
    FileSource,
    UploadFile,
    UpupThemeMode,
    ResolvedImageEditorOptions,
    FilesProgressMap,
} from '@upup/core'
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
} from '@upup/core/internal'
import { UploadStatus } from '@upup/core'
import type { UploaderProps, UploaderIcons } from '../shared/types'

export { UploadStatus }

// ─── Context type shapes (Readable<T> wherever Vue used ComputedRef<T>) ───
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
    uploadStatus: Readable<UploadStatus>
    uploadError: Readable<string | undefined>
    uploadErrorCode: Readable<string | undefined>
    totalProgress: Readable<number>
    filesProgressMap: Readable<FilesProgressMap>
    uploadSpeed: Readable<number>
    uploadEta: Readable<number>
    uploadedBytes: Readable<number>
    totalBytes: Readable<number>
}

export type ContextRuntime = Omit<BaseContextRuntime, 'isOnline'> & {
    /** Register the hidden file <input> (Svelte `bind:this`) so openFilePicker can click it. */
    registerFileInput: (el: HTMLInputElement | null) => void
    /** Read the registered hidden file <input> (to toggle webkitdirectory/directory or reset value). */
    getFileInput: () => HTMLInputElement | null
    isOnline: Readable<boolean>
}

export type ContextSource = Omit<BaseContextSource, 'activeSource'> & {
    activeSource: Readable<FileSource | undefined>
}

export type ContextI18n = BaseContextI18n

export type ContextFiles = Omit<BaseContextFiles, 'files'> & {
    files: Readable<Map<string, UploadFile>>
}

export type ContextUploadControls = Omit<
    BaseContextUploadControls,
    'upload'
> & {
    upload: ContextUpload
}

export type ContextView = Omit<BaseContextView, 'isAddingMore' | 'viewMode'> & {
    isAddingMore: Readable<boolean>
    viewMode: Readable<'grid' | 'list'>
}

export type ContextEditor = Omit<BaseContextEditor, 'editingFile'> & {
    editingFile: Readable<UploadFile | null>
}

export type ContextTheme = Omit<
    BaseContextTheme,
    'themeMode' | 'isDark' | 'tokens' | 'resolved' | 'slotOverrides' | 'slots'
> & {
    themeMode: Readable<Exclude<UpupThemeMode, 'system'>>
    isDark: Readable<boolean>
    // Reactive (mirroring React): ThemeStore recomputes these at init() and on
    // OS dark/light change, so `themeMode:'system'` resolves live instead of
    // freezing the construction-time (light) values.
    tokens: Readable<BaseContextTheme['tokens']>
    resolved: Readable<BaseContextTheme['resolved']>
    slotOverrides: Readable<BaseContextTheme['slotOverrides']>
    slots: Readable<BaseContextTheme['slots']>
}

export type ContextProps = Required<
    Pick<
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
    >
> &
    // Explicit `| undefined` (via indexed access) rather than `Pick`: under
    // `exactOptionalPropertyTypes` the bridge assigns these from destructured
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

// ─── Keys ───────────────────────────────────────────────────
const RuntimeKey = Symbol('upup-runtime')
const SourceKey = Symbol('upup-source')
const I18nKey = Symbol('upup-i18n')
const FilesKey = Symbol('upup-files')
const UploadControlsKey = Symbol('upup-upload-controls')
const ViewKey = Symbol('upup-view')
const EditorKey = Symbol('upup-editor')
const OptionsKey = Symbol('upup-options')
const ThemeKey = Symbol('upup-theme')
const RootKey = Symbol('upup-root')

// ─── Provider ───────────────────────────────────────────────
export function provideUploaderContext(value: IUploaderContext): void {
    setContext(RootKey, value)
    setContext(RuntimeKey, {
        core: value.core,
        orchestrator: value.orchestrator,
        mode: value.mode,
        serverUrl: value.serverUrl,
        registerFileInput: value.registerFileInput,
        getFileInput: value.getFileInput,
        openFilePicker: value.openFilePicker,
        isOnline: value.isOnline,
    })
    setContext(SourceKey, {
        activeSource: value.activeSource,
        setActiveSource: value.setActiveSource,
        cloudDrives: value.cloudDrives,
    })
    setContext(I18nKey, {
        translations: value.translations,
        translator: value.translator,
        lang: value.lang,
        dir: value.dir,
    })
    setContext(FilesKey, {
        files: value.files,
        setFiles: value.setFiles,
        replaceFiles: value.replaceFiles,
        resetState: value.resetState,
        uploadFiles: value.uploadFiles,
        handleFileRemove: value.handleFileRemove,
    })
    setContext(UploadControlsKey, {
        upload: value.upload,
        handleDone: value.handleDone,
        handleCancel: value.handleCancel,
        handlePause: value.handlePause,
        handleResume: value.handleResume,
    })
    setContext(ViewKey, {
        isAddingMore: value.isAddingMore,
        setIsAddingMore: value.setIsAddingMore,
        viewMode: value.viewMode,
        setViewMode: value.setViewMode,
    })
    setContext(EditorKey, {
        editingFile: value.editingFile,
        openImageEditor: value.openImageEditor,
        closeImageEditor: value.closeImageEditor,
        saveImageEdit: value.saveImageEdit,
        replaceFile: value.replaceFile,
    })
    setContext(OptionsKey, value.props)
    setContext(ThemeKey, value.theme)
}

// ─── Consumers (throw outside <UpupUploader />) ─────────────
function read<T>(key: symbol, name: string): T {
    const value = getContext<T | undefined>(key)
    if (!value) throw new Error(`${name} must be used inside <UpupUploader />`)
    return value
}

export const useUploaderContext = () =>
    read<IUploaderContext>(RootKey, 'useUploaderContext')
export const useUploaderRuntime = () =>
    read<ContextRuntime>(RuntimeKey, 'useUploaderRuntime')
export const useUploaderSource = () =>
    read<ContextSource>(SourceKey, 'useUploaderSource')
export const useUploaderI18n = () =>
    read<ContextI18n>(I18nKey, 'useUploaderI18n')
export const useUploaderFiles = () =>
    read<ContextFiles>(FilesKey, 'useUploaderFiles')
export const useUploaderUploadControls = () =>
    read<ContextUploadControls>(UploadControlsKey, 'useUploaderUploadControls')
export const useUploaderView = () =>
    read<ContextView>(ViewKey, 'useUploaderView')
export const useUploaderEditor = () =>
    read<ContextEditor>(EditorKey, 'useUploaderEditor')
export const useUploaderOptions = () =>
    read<ContextProps>(OptionsKey, 'useUploaderOptions')
export const useUploaderTheme = () =>
    read<ContextTheme>(ThemeKey, 'useUploaderTheme')
