import {
    createContext,
    Dispatch,
    RefObject,
    SetStateAction,
    useContext,
} from 'react'
import type { UpupCore } from '@upup/core'
import {
    BoxConfigs,
    DropboxConfigs,
    FileWithParams,
    GoogleDriveConfigs,
    OneDriveConfigs,
    ResolvedImageEditorOptions,
    Translations,
    UploadAdapter,
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
    proceedUpload: () => Promise<FileWithParams[] | undefined>
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
        | 'uploadAdapters'
        | 'accept'
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
        | 'classNames'
        | 'icons'
        | 'showSelectFolderButton'
        | 'showBranding'
        | 'className'
        | 'style'
    >
> &
    Pick<UpupUploaderProps, 'maxFileSize' | 'maxRetries' | 'resumable'> & {
        /** Derived from `maxFiles ?? restrictions?.maxNumberOfFiles ?? 10`. */
        limit: number
        /** Derived from `theme?.mode === 'dark'`. */
        dark: boolean
        multiple: boolean
        icons: Required<UpupUploaderPropsIcons>
        imageEditor: ResolvedImageEditorOptions
    }

export interface IRootContext {
    /** v2: UpupCore instance — coexists with v1 engine */
    core: UpupCore | null
    inputRef: RefObject<HTMLInputElement | null>
    activeAdapter?: UploadAdapter
    setActiveAdapter: Dispatch<SetStateAction<UploadAdapter | undefined>>

    translations: Translations
    /** ICU-capable translator — present when `i18n.bundle` is supplied */
    translator?: import('@upup/shared').Translator
    lang: string
    dir: 'ltr' | 'rtl'
    /** Per-slot className overrides from theme.slots */
    themeSlots?: import('@upup/shared').UpupThemeSlots

    files: Map<string, FileWithParams>
    setFiles: (newFiles: File[]) => void
    dynamicallyReplaceFiles: (files: File[] | FileWithParams[]) => void
    resetState: () => void
    dynamicUpload: (
        files: File[] | FileWithParams[],
    ) => Promise<FileWithParams[] | undefined>
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

    editingFile: FileWithParams | null
    openImageEditor: (file: FileWithParams) => void
    closeImageEditor: () => void
    saveImageEdit: (editedImageData: string, mimeType?: string) => void
    replaceFile: (fileId: string, newFile: FileWithParams) => void

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
