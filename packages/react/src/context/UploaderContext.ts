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
import type { FileSource, ResolvedImageEditorOptions } from '@upup/core'
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

export type ContextUpload = BaseContextUpload & {
    setUploadStatus: Dispatch<SetStateAction<UploadStatus>>
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
        | 'icons'
        | 'showBranding'
        | 'className'
        | 'style'
        | 'disableDragDrop'
    >
> &
    Pick<UploaderProps, 'maxFileSize' | 'maxRetries' | 'resumable'> & {
        allowedFileTypes: string
        limit: number
        folderUploadAllowDrop: boolean
        folderPickerButtonVisible: boolean
        multiple: boolean
        icons: Required<UploaderIcons>
        imageEditor: ResolvedImageEditorOptions
    }

export type ContextRuntime = BaseContextRuntime & {
    /** @deprecated Use openFilePicker() instead */
    inputRef: RefObject<HTMLInputElement | null>
}

export type ContextSource = Omit<BaseContextSource, 'setActiveSource'> & {
    setActiveSource: Dispatch<SetStateAction<FileSource | undefined>>
}

export type ContextI18n = BaseContextI18n

export type ContextFiles = BaseContextFiles

export type ContextUploadControls = Omit<
    BaseContextUploadControls,
    'upload'
> & {
    upload: ContextUpload
}

export type ContextView = Omit<
    BaseContextView,
    'setIsAddingMore' | 'setViewMode'
> & {
    setIsAddingMore: Dispatch<SetStateAction<boolean>>
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

function readContext<T>(context: Context<T | null>, name: string): T {
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
}) {
    const runtime = useMemo<ContextRuntime>(
        () => ({
            core: value.core,
            orchestrator: value.orchestrator,
            mode: value.mode,
            serverUrl: value.serverUrl,
            inputRef: value.inputRef,
            openFilePicker: value.openFilePicker,
            isOnline: value.isOnline,
        }),
        [
            value.core,
            value.orchestrator,
            value.inputRef,
            value.isOnline,
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
            isAddingMore: value.isAddingMore,
            setIsAddingMore: value.setIsAddingMore,
            viewMode: value.viewMode,
            setViewMode: value.setViewMode,
        }),
        [
            value.isAddingMore,
            value.setIsAddingMore,
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
export function useUploaderContext() {
    return readContext(UploaderContext, 'useUploaderContext')
}

export function useUploaderRuntime() {
    return readContext(RuntimeContext, 'useUploaderRuntime')
}

export function useUploaderSource() {
    return readContext(SourceContext, 'useUploaderSource')
}

export function useUploaderI18n() {
    return readContext(I18nContext, 'useUploaderI18n')
}

export function useUploaderFiles() {
    return readContext(FilesContext, 'useUploaderFiles')
}

export function useUploaderUploadControls() {
    return readContext(UploadControlsContext, 'useUploaderUploadControls')
}

export function useUploaderView() {
    return readContext(ViewContext, 'useUploaderView')
}

export function useUploaderEditor() {
    return readContext(EditorContext, 'useUploaderEditor')
}

export function useUploaderOptions() {
    return readContext(OptionsContext, 'useUploaderOptions')
}

export function useUploaderTheme() {
    return readContext(ThemeContext, 'useUploaderTheme')
}

export default UploaderContext
