import { getContext, setContext } from 'svelte'
import type { Readable } from 'svelte/store'
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
    MotionMode,
} from '@upupjs/core/internal'
import { UploadStatus } from '@upupjs/core'
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
    /** Resolved `data-motion` value ('on' | 'off') from the core motion gate. */
    motionMode: Readable<MotionMode>
}

export type ContextSource = Omit<BaseContextSource, 'activeSource'> & {
    activeSource: Readable<FileSource | undefined>
}

export type ContextI18n = BaseContextI18n

export type ContextFiles = Omit<BaseContextFiles, 'files'> & {
    files: Readable<Map<string, UploadFile>>
    /** Transient: file ids currently playing their exit animation. Read by
     *  FileList (hero) and FileItem (cards) to render `upup-fx-exit`. Sourced
     *  from the core transient-UI store (deferred removal). */
    leavingFileIds: Readable<ReadonlySet<string>>
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
    /** Add-more source overlay: source surface mounted above the dimmed,
     *  still-mounted file list. Sourced from the core transient-UI store. */
    sourceOverlayOpen: Readable<boolean>
    /** Overlay is playing its reverse close-slide before it unmounts. */
    sourceOverlayClosing: Readable<boolean>
    openSourceOverlay: () => void
    closeSourceOverlay: () => void
    /** Human provider label whose read-only picker just rejected an OS drop —
     *  drives the drop-rejection toast. Null when no rejection is showing.
     *  Auto-clears via the core transient-UI store's 3s window. */
    dropRejected: Readable<string | null>
    /** Raise the drop-rejection toast for a read-only drive source (resolves the
     *  provider label, then flags the core store). Wired to core's
     *  DragDropController.onReadonlyDropRejected. */
    flagDriveDropRejected: (source: FileSource) => void
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
    | 'quietCompletion'
    | 'className'
    | 'style'
    | 'disableDragDrop'
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
    /**
     * Re-resolve the live ThemeStore when the `theme` prop changes after mount
     * (mirrors React's `controller.theme.setThemeConfig(theme)` effect). The
     * store short-circuits on a structurally-equal config, so an inlined object
     * literal per render does not loop.
     */
    setThemeConfig: (config: UploaderProps['theme']) => void
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
        motionMode: value.motionMode,
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
        leavingFileIds: value.leavingFileIds,
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
        sourceOverlayOpen: value.sourceOverlayOpen,
        sourceOverlayClosing: value.sourceOverlayClosing,
        openSourceOverlay: value.openSourceOverlay,
        closeSourceOverlay: value.closeSourceOverlay,
        dropRejected: value.dropRejected,
        flagDriveDropRejected: value.flagDriveDropRejected,
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
// `value` carries T so the generic relates the passed-in context to the return
// (a real generic, not a disguised assertion): each consumer reads its own
// typed getContext and this asserts presence at the <UpupUploader /> boundary.
function read<T>(name: string, value: T | undefined): T {
    if (value === undefined)
        throw new Error(`${name} must be used inside <UpupUploader />`)
    return value
}

export const useUploaderContext = (): IUploaderContext =>
    read(
        'useUploaderContext',
        getContext<IUploaderContext | undefined>(RootKey),
    )
export const useUploaderRuntime = (): ContextRuntime =>
    read(
        'useUploaderRuntime',
        getContext<ContextRuntime | undefined>(RuntimeKey),
    )
export const useUploaderSource = (): ContextSource =>
    read('useUploaderSource', getContext<ContextSource | undefined>(SourceKey))
export const useUploaderI18n = (): ContextI18n =>
    read('useUploaderI18n', getContext<ContextI18n | undefined>(I18nKey))
export const useUploaderFiles = (): ContextFiles =>
    read('useUploaderFiles', getContext<ContextFiles | undefined>(FilesKey))
export const useUploaderUploadControls = (): ContextUploadControls =>
    read(
        'useUploaderUploadControls',
        getContext<ContextUploadControls | undefined>(UploadControlsKey),
    )
export const useUploaderView = (): ContextView =>
    read('useUploaderView', getContext<ContextView | undefined>(ViewKey))
export const useUploaderEditor = (): ContextEditor =>
    read('useUploaderEditor', getContext<ContextEditor | undefined>(EditorKey))
export const useUploaderOptions = (): ContextProps =>
    read('useUploaderOptions', getContext<ContextProps | undefined>(OptionsKey))
export const useUploaderTheme = (): ContextTheme =>
    read('useUploaderTheme', getContext<ContextTheme | undefined>(ThemeKey))
