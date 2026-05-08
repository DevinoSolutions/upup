import {
    createContext,
    Dispatch,
    RefObject,
    SetStateAction,
    useContext,
} from 'react'
import type {
    FileSource,
    InternalFlatClassNames,
    UpupCore,
    UploadFile,
    UpupThemeMode,
} from '@upup/core'
import {
    BoxConfigs,
    DropboxConfigs,
    GoogleDriveConfigs,
    OneDriveConfigs,
    ResolvedImageEditorOptions,
    Translations,
    UpupUploaderProps,
    UpupUploaderPropsIcons,
} from '../shared/types'
import { FilesProgressMap } from '../hooks/useRootProvider'

export enum UploadStatus {
    PENDING = 'PENDING',
    ONGOING = 'ONGOING',
    PAUSED = 'PAUSED',
    SUCCESSFUL = 'SUCCESSFUL',
    FAILED = 'FAILED',
}

type ContextUpload = {
    uploadStatus: UploadStatus
    uploadError?: string
    setUploadStatus: Dispatch<SetStateAction<UploadStatus>>
    totalProgress: number
    filesProgressMap: FilesProgressMap
    proceedUpload: () => Promise<UploadFile[] | undefined>
    retryUpload: (fileId?: string) => Promise<UploadFile[] | undefined>
    /** Current upload speed in bytes/sec (rolling average) */
    uploadSpeed: number
    /** Estimated seconds remaining */
    uploadEta: number
    /** Total bytes uploaded so far across all files */
    uploadedBytes: number
    /** Total bytes to upload across all files */
    totalBytes: number
}

type ContextProps = Required<
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
        | 'enablePaste'
        | 'onError'
        | 'icons'
        | 'showBranding'
        | 'className'
        | 'style'
    >
> &
    Pick<UpupUploaderProps, 'maxFileSize' | 'maxRetries' | 'resumable'> & {
        /** Resolved allowedFileTypes string (presets already expanded by resolveAccept). */
        allowedFileTypes: string
        /** Derived from `maxFiles ?? restrictions?.maxNumberOfFiles ?? 10`. */
        limit: number
        /** Effective theme mode after resolving `theme.mode: "system"`. */
        themeMode: Exclude<UpupThemeMode, 'system'>
        /** Internal convenience flag derived from `themeMode`. */
        isDarkTheme: boolean
        folderPickerButtonVisible: boolean
        /** Internal projection of public `theme.slots` for component slots. */
        slotClasses: InternalFlatClassNames
        multiple: boolean
        icons: Required<UpupUploaderPropsIcons>
        imageEditor: ResolvedImageEditorOptions
    }

export interface IRootContext {
    /** v2: UpupCore instance — coexists with v1 engine */
    core: UpupCore | null
    /** v2.2: 'client' (default) or 'server' — picks the upload mode. */
    mode: 'client' | 'server'
    /** v2.2: Resolved base URL where `@upup/server`'s `createHandler()` is mounted. */
    serverUrl?: string
    inputRef: RefObject<HTMLInputElement | null>
    activeAdapter?: FileSource
    setActiveAdapter: Dispatch<SetStateAction<FileSource | undefined>>

    translations: Translations
    /** ICU-capable translator — present when `i18n.bundle` is supplied */
    translator?: import('@upup/core').Translator
    lang: string
    dir: 'ltr' | 'rtl'
    /** Per-slot className overrides from theme.slots */
    themeSlots?: import('@upup/core').DeepPartialSlots

    files: Map<string, UploadFile>
    setFiles: (newFiles: File[]) => void
    dynamicallyReplaceFiles: (files: File[] | UploadFile[]) => void
    resetState: () => void
    dynamicUpload: (
        files: File[] | UploadFile[],
    ) => Promise<UploadFile[] | undefined>
    isAddingMore: boolean
    setIsAddingMore: Dispatch<SetStateAction<boolean>>

    viewMode: 'grid' | 'list'
    setViewMode: Dispatch<SetStateAction<'grid' | 'list'>>

    /** v2: true when the browser has network connectivity */
    isOnline: boolean

    handleFileRemove: (fileId: string) => void
    handleDone: () => void
    handleCancel: () => void
    handlePause: () => void
    handleResume: () => void

    editingFile: UploadFile | null
    openImageEditor: (file: UploadFile) => void
    closeImageEditor: () => void
    saveImageEdit: (editedImageData: string, mimeType?: string) => void
    replaceFile: (fileId: string, newFile: UploadFile) => void

    oneDriveConfigs?: OneDriveConfigs
    googleDriveConfigs?: GoogleDriveConfigs
    dropboxConfigs?: DropboxConfigs
    boxConfigs?: BoxConfigs
    upload: ContextUpload
    props: ContextProps
}

const RootContext = createContext<IRootContext>({
    props: {},
    files: new Map(),
} as IRootContext)

export function useRootContext() {
    const contextValue = useContext(RootContext)
    return contextValue
}

export default RootContext
