import {
    createContext,
    createElement,
    Dispatch,
    RefObject,
    SetStateAction,
    useContext,
    useMemo,
    type Context,
    type ReactNode,
} from 'react'
import type { FileSource, ResolvedImageEditorOptions } from '@upupjs/core'
import type { MotionMode } from '@upupjs/core/internal'
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

export type ContextUpload = BaseContextUpload & {
    setUploadStatus: Dispatch<SetStateAction<UploadStatus>>
}

/** Like Required but also strips `| undefined` — necessary under exactOptionalPropertyTypes. */
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
    | 'icons'
    | 'showBranding'
    | 'className'
    | 'style'
    | 'disableDragDrop'
> &
    Pick<UploaderProps, 'maxFileSize' | 'maxRetries' | 'resumable'> & {
        allowedFileTypes: string
        limit: number
        folderUploadAllowDrop: boolean
        folderPickerButtonVisible: boolean
        multiple: boolean
        icons: { [K in keyof UploaderIcons]-?: NonNullable<UploaderIcons[K]> }
        imageEditor: ResolvedImageEditorOptions
    }

export type ContextRuntime = BaseContextRuntime & {
    /** @deprecated Use openFilePicker() instead */
    inputRef: RefObject<HTMLInputElement | null>
    /** Resolved `data-motion` value ('on' | 'off') from the core motion gate. */
    motionMode: MotionMode
}

export type ContextSource = Omit<BaseContextSource, 'setActiveSource'> & {
    setActiveSource: Dispatch<SetStateAction<FileSource | undefined>>
}

export type ContextI18n = BaseContextI18n

export type ContextFiles = BaseContextFiles & {
    /** Transient: file ids currently playing their exit animation. Read by
     *  FileList (hero) and FileItem (cards) to render `upup-fx-exit`. Sourced
     *  from the core transient-UI store (deferred removal). */
    leavingFileIds: ReadonlySet<string>
}

export type ContextUploadControls = Omit<
    BaseContextUploadControls,
    'upload'
> & {
    upload: ContextUpload
}

export type ContextView = Omit<
    BaseContextView,
    'isAddingMore' | 'setIsAddingMore' | 'setViewMode'
> & {
    /** Add-more source overlay: source surface mounted above the dimmed,
     *  still-mounted file list. Sourced from the core transient-UI store
     *  (replaces the retired `isAddingMore` flag in the React canon). */
    sourceOverlayOpen: boolean
    /** Overlay is playing its reverse close-slide before it unmounts. */
    sourceOverlayClosing: boolean
    openSourceOverlay: () => void
    closeSourceOverlay: () => void
    /** Human provider label whose read-only picker just rejected an OS drop —
     *  drives the drop-rejection toast. Null when no rejection is showing.
     *  Auto-clears via the core transient-UI store's 3s window. */
    dropRejected: string | null
    /** Raise the drop-rejection toast for a read-only drive source (resolves the
     *  provider label, then flags the core store). Wired to core's
     *  DragDropController.onReadonlyDropRejected. */
    flagDriveDropRejected: (source: FileSource) => void
    setViewMode: Dispatch<SetStateAction<'grid' | 'list'>>
}

export type ContextEditor = BaseContextEditor

export type ContextTheme = BaseContextTheme

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

const UploaderContext = createContext<IUploaderContext | null>(null)
const RuntimeContext = createContext<ContextRuntime | null>(null)
const SourceContext = createContext<ContextSource | null>(null)
const I18nContext = createContext<ContextI18n | null>(null)
const FilesContext = createContext<ContextFiles | null>(null)
const UploadControlsContext = createContext<ContextUploadControls | null>(null)
const ViewContext = createContext<ContextView | null>(null)
const EditorContext = createContext<ContextEditor | null>(null)
const OptionsContext = createContext<ContextProps | null>(null)
const ThemeContext = createContext<ContextTheme | null>(null)

function useContextOrThrow<T>(context: Context<T | null>, name: string): T {
    const value = useContext(context)
    if (!value) {
        throw new Error(`${name} must be used inside <UpupUploader />`)
    }
    return value
}

export function UploaderContextProvider({
    value,
    children,
}: {
    value: IUploaderContext
    children: ReactNode
}): ReactNode {
    const runtime = useMemo<ContextRuntime>(
        () => ({
            core: value.core,
            orchestrator: value.orchestrator,
            mode: value.mode,
            serverUrl: value.serverUrl,
            // eslint-disable-next-line @typescript-eslint/no-deprecated -- runtime context must still expose inputRef for back-compat consumers; v3 removal tracked
            inputRef: value.inputRef,
            openFilePicker: value.openFilePicker,
            isOnline: value.isOnline,
            motionMode: value.motionMode,
        }),
        [
            value.core,
            value.orchestrator,
            // eslint-disable-next-line @typescript-eslint/no-deprecated -- see above
            value.inputRef,
            value.isOnline,
            value.motionMode,
            value.mode,
            value.openFilePicker,
            value.serverUrl,
        ],
    )

    const source = useMemo<ContextSource>(
        () => ({
            activeSource: value.activeSource,
            setActiveSource: value.setActiveSource,
            cloudDrives: value.cloudDrives,
        }),
        [value.activeSource, value.cloudDrives, value.setActiveSource],
    )

    const i18n = useMemo<ContextI18n>(
        () => ({
            translations: value.translations,
            translator: value.translator,
            lang: value.lang,
            dir: value.dir,
        }),
        [value.dir, value.lang, value.translations, value.translator],
    )

    const files = useMemo<ContextFiles>(
        () => ({
            files: value.files,
            leavingFileIds: value.leavingFileIds,
            setFiles: value.setFiles,
            replaceFiles: value.replaceFiles,
            resetState: value.resetState,
            uploadFiles: value.uploadFiles,
            handleFileRemove: value.handleFileRemove,
        }),
        [
            value.uploadFiles,
            value.replaceFiles,
            value.files,
            value.leavingFileIds,
            value.handleFileRemove,
            value.resetState,
            value.setFiles,
        ],
    )

    const uploadControls = useMemo<ContextUploadControls>(
        () => ({
            upload: value.upload,
            handleDone: value.handleDone,
            handleCancel: value.handleCancel,
            handlePause: value.handlePause,
            handleResume: value.handleResume,
        }),
        [
            value.handleCancel,
            value.handleDone,
            value.handlePause,
            value.handleResume,
            value.upload,
        ],
    )

    const view = useMemo<ContextView>(
        () => ({
            sourceOverlayOpen: value.sourceOverlayOpen,
            sourceOverlayClosing: value.sourceOverlayClosing,
            openSourceOverlay: value.openSourceOverlay,
            closeSourceOverlay: value.closeSourceOverlay,
            dropRejected: value.dropRejected,
            flagDriveDropRejected: value.flagDriveDropRejected,
            viewMode: value.viewMode,
            setViewMode: value.setViewMode,
        }),
        [
            value.sourceOverlayOpen,
            value.sourceOverlayClosing,
            value.openSourceOverlay,
            value.closeSourceOverlay,
            value.dropRejected,
            value.flagDriveDropRejected,
            value.setViewMode,
            value.viewMode,
        ],
    )

    const editor = useMemo<ContextEditor>(
        () => ({
            editingFile: value.editingFile,
            openImageEditor: value.openImageEditor,
            closeImageEditor: value.closeImageEditor,
            saveImageEdit: value.saveImageEdit,
            replaceFile: value.replaceFile,
        }),
        [
            value.closeImageEditor,
            value.editingFile,
            value.openImageEditor,
            value.replaceFile,
            value.saveImageEdit,
        ],
    )

    const options = useMemo(
        () => value.props,
        // eslint-disable-next-line react-hooks/exhaustive-deps -- intentional: memoize on granular prop fields, not the parent object identity (which changes every render)
        [
            value.props.allowedFileTypes,
            value.props.allowPreview,
            value.props.className,
            value.props.disableDragDrop,
            value.props.enablePaste,
            value.props.folderPickerButtonVisible,
            value.props.folderUploadAllowDrop,
            value.props.icons,
            value.props.imageEditor,
            value.props.isProcessing,
            value.props.limit,
            value.props.maxFileSize,
            value.props.maxRetries,
            value.props.mini,
            value.props.multiple,
            value.props.onError,
            value.props.onFileClick,
            value.props.onFilesDragLeave,
            value.props.onFilesDragOver,
            value.props.onFilesDrop,
            value.props.onWarn,
            value.props.onIntegrationClick,
            value.props.resumable,
            value.props.showBranding,
            value.props.sources,
            value.props.style,
        ],
    )

    const theme = useMemo(
        () => value.theme,
        // eslint-disable-next-line react-hooks/exhaustive-deps -- intentional: memoize on granular theme fields, not the parent object identity (which changes every render)
        [
            value.theme.isDark,
            value.theme.resolved,
            value.theme.slotOverrides,
            value.theme.slots,
            value.theme.themeMode,
            value.theme.tokens,
        ],
    )

    return createElement(
        UploaderContext.Provider,
        { value },
        createElement(
            RuntimeContext.Provider,
            { value: runtime },
            createElement(
                SourceContext.Provider,
                { value: source },
                createElement(
                    I18nContext.Provider,
                    { value: i18n },
                    createElement(
                        FilesContext.Provider,
                        { value: files },
                        createElement(
                            UploadControlsContext.Provider,
                            { value: uploadControls },
                            createElement(
                                ViewContext.Provider,
                                { value: view },
                                createElement(
                                    EditorContext.Provider,
                                    { value: editor },
                                    createElement(
                                        OptionsContext.Provider,
                                        { value: options },
                                        createElement(
                                            ThemeContext.Provider,
                                            { value: theme },
                                            children,
                                        ),
                                    ),
                                ),
                            ),
                        ),
                    ),
                ),
            ),
        ),
    )
}

/** Compatibility aggregate hook. New internals should use the focused hooks. */
export function useUploaderContext(): IUploaderContext {
    return useContextOrThrow(UploaderContext, 'useUploaderContext')
}

export function useUploaderRuntime(): ContextRuntime {
    return useContextOrThrow(RuntimeContext, 'useUploaderRuntime')
}

export function useUploaderSource(): ContextSource {
    return useContextOrThrow(SourceContext, 'useUploaderSource')
}

export function useUploaderI18n(): ContextI18n {
    return useContextOrThrow(I18nContext, 'useUploaderI18n')
}

export function useUploaderFiles(): ContextFiles {
    return useContextOrThrow(FilesContext, 'useUploaderFiles')
}

export function useUploaderUploadControls(): ContextUploadControls {
    return useContextOrThrow(UploadControlsContext, 'useUploaderUploadControls')
}

export function useUploaderView(): ContextView {
    return useContextOrThrow(ViewContext, 'useUploaderView')
}

export function useUploaderEditor(): ContextEditor {
    return useContextOrThrow(EditorContext, 'useUploaderEditor')
}

export function useUploaderOptions(): ContextProps {
    return useContextOrThrow(OptionsContext, 'useUploaderOptions')
}

export function useUploaderTheme(): ContextTheme {
    return useContextOrThrow(ThemeContext, 'useUploaderTheme')
}

export default UploaderContext
