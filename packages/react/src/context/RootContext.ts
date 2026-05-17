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
import type {
    DeepPartialSlots,
    FileSource,
    FilesProgressMap,
    InternalFlatClassNames,
    Translations,
    Translator,
    UpupCore,
    UploadFile,
    UpupResolvedTheme,
    UpupThemeMode,
    UpupThemeTokens,
} from '@upup/core'
import { UploadStatus } from '@upup/core'
import {
    BoxConfigs,
    DropboxConfigs,
    GoogleDriveConfigs,
    OneDriveConfigs,
    ResolvedImageEditorOptions,
    UpupUploaderProps,
    UpupUploaderPropsIcons,
} from '../shared/types'

export { UploadStatus }

export type ContextUpload = {
    uploadStatus: UploadStatus
    uploadError?: string
    setUploadStatus: Dispatch<SetStateAction<UploadStatus>>
    totalProgress: number
    filesProgressMap: FilesProgressMap
    proceedUpload: () => Promise<UploadFile[] | undefined>
    retryUpload: (fileId?: string) => Promise<UploadFile[] | undefined>
    uploadSpeed: number
    uploadEta: number
    uploadedBytes: number
    totalBytes: number
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
        | 'icons'
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

export type ContextRuntime = {
    core: UpupCore | null
    mode: 'client' | 'server'
    serverUrl?: string
    /** @deprecated Use openFilePicker() instead */
    inputRef: RefObject<HTMLInputElement | null>
    openFilePicker: () => void
    isOnline: boolean
}

export type ContextSource = {
    activeAdapter?: FileSource
    setActiveAdapter: Dispatch<SetStateAction<FileSource | undefined>>
    oneDriveConfigs?: OneDriveConfigs
    googleDriveConfigs?: GoogleDriveConfigs
    dropboxConfigs?: DropboxConfigs
    boxConfigs?: BoxConfigs
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
    setIsAddingMore: Dispatch<SetStateAction<boolean>>
    viewMode: 'grid' | 'list'
    setViewMode: Dispatch<SetStateAction<'grid' | 'list'>>
}

export type ContextEditor = {
    editingFile: UploadFile | null
    openImageEditor: (file: UploadFile) => void
    closeImageEditor: () => void
    saveImageEdit: (editedImageData: string, mimeType?: string) => void
    replaceFile: (fileId: string, newFile: UploadFile) => void
}

type ReactResolvedTheme = Omit<UpupResolvedTheme, 'mode'> & {
    mode: Exclude<UpupThemeMode, 'system'>
}

export type ContextTheme = {
    themeMode: Exclude<UpupThemeMode, 'system'>
    isDark: boolean
    tokens: UpupThemeTokens
    resolved: ReactResolvedTheme
    slotOverrides: InternalFlatClassNames
    slots: DeepPartialSlots
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

const RootContext = createContext<IRootContext | null>(null)
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

export function RootContextProvider({
    value,
    children,
}: {
    value: IRootContext
    children: ReactNode
}) {
    const runtime = useMemo<ContextRuntime>(() => ({
        core: value.core,
        mode: value.mode,
        serverUrl: value.serverUrl,
        inputRef: value.inputRef,
        openFilePicker: value.openFilePicker,
        isOnline: value.isOnline,
    }), [value.core, value.inputRef, value.isOnline, value.mode, value.openFilePicker, value.serverUrl])

    const source = useMemo<ContextSource>(() => ({
        activeAdapter: value.activeAdapter,
        setActiveAdapter: value.setActiveAdapter,
        oneDriveConfigs: value.oneDriveConfigs,
        googleDriveConfigs: value.googleDriveConfigs,
        dropboxConfigs: value.dropboxConfigs,
        boxConfigs: value.boxConfigs,
    }), [
        value.activeAdapter,
        value.boxConfigs,
        value.dropboxConfigs,
        value.googleDriveConfigs,
        value.oneDriveConfigs,
        value.setActiveAdapter,
    ])

    const i18n = useMemo<ContextI18n>(() => ({
        translations: value.translations,
        translator: value.translator,
        lang: value.lang,
        dir: value.dir,
    }), [value.dir, value.lang, value.translations, value.translator])

    const files = useMemo<ContextFiles>(() => ({
        files: value.files,
        setFiles: value.setFiles,
        dynamicallyReplaceFiles: value.dynamicallyReplaceFiles,
        resetState: value.resetState,
        dynamicUpload: value.dynamicUpload,
        handleFileRemove: value.handleFileRemove,
    }), [
        value.dynamicUpload,
        value.dynamicallyReplaceFiles,
        value.files,
        value.handleFileRemove,
        value.resetState,
        value.setFiles,
    ])

    const uploadControls = useMemo<ContextUploadControls>(() => ({
        upload: value.upload,
        handleDone: value.handleDone,
        handleCancel: value.handleCancel,
        handlePause: value.handlePause,
        handleResume: value.handleResume,
    }), [
        value.handleCancel,
        value.handleDone,
        value.handlePause,
        value.handleResume,
        value.upload,
    ])

    const view = useMemo<ContextView>(() => ({
        isAddingMore: value.isAddingMore,
        setIsAddingMore: value.setIsAddingMore,
        viewMode: value.viewMode,
        setViewMode: value.setViewMode,
    }), [
        value.isAddingMore,
        value.setIsAddingMore,
        value.setViewMode,
        value.viewMode,
    ])

    const editor = useMemo<ContextEditor>(() => ({
        editingFile: value.editingFile,
        openImageEditor: value.openImageEditor,
        closeImageEditor: value.closeImageEditor,
        saveImageEdit: value.saveImageEdit,
        replaceFile: value.replaceFile,
    }), [
        value.closeImageEditor,
        value.editingFile,
        value.openImageEditor,
        value.replaceFile,
        value.saveImageEdit,
    ])

    const options = useMemo(() => value.props, [
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
    ])

    const theme = useMemo(() => value.theme, [
        value.theme.isDark,
        value.theme.resolved,
        value.theme.slotOverrides,
        value.theme.slots,
        value.theme.themeMode,
        value.theme.tokens,
    ])

    return createElement(
        RootContext.Provider,
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
export function useRootContext() {
    return readContext(RootContext, 'useRootContext')
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

export default RootContext
