import {
    createContext,
    Dispatch,
    RefObject,
    SetStateAction,
    useContext,
} from 'react'
import {
    DropboxConfigs,
    FileWithParams,
    GoogleDriveConfigs,
    OneDriveConfigs,
    ResolvedImageEditorOptions,
    Translations,
    UploadAdapter,
    UpupUploaderProps,
    UpupUploaderPropsIcons,
} from '../../shared/types'
import { FilesProgressMap } from '../hooks/useRootProvider'

export enum UploadStatus {
    PENDING = 'PENDING',
    ONGOING = 'ONGOING',
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
}

type ContextProps = Required<
    Pick<
        UpupUploaderProps,
        | 'uploadAdapters'
        | 'accept'
        | 'limit'
        | 'isProcessing'
        | 'allowPreview'
        | 'mini'
        | 'onFileClick'
        | 'onIntegrationClick'
        | 'onFilesDragOver'
        | 'onFilesDragLeave'
        | 'onFilesDrop'
        | 'onError'
        | 'dark'
        | 'classNames'
        | 'icons'
        | 'showSelectFolderButton'
    >
> &
    Pick<UpupUploaderProps, 'maxFileSize'> & {
        multiple: boolean
        icons: Required<UpupUploaderPropsIcons>
        imageEditor: ResolvedImageEditorOptions
    }

export interface IRootContext {
    inputRef: RefObject<HTMLInputElement | null>
    activeAdapter?: UploadAdapter
    setActiveAdapter: Dispatch<SetStateAction<UploadAdapter | undefined>>

    translations: Translations

    files: Map<string, FileWithParams>
    setFiles: (newFiles: File[]) => void
    dynamicallyReplaceFiles: (files: File[] | FileWithParams[]) => void
    resetState: () => void
    dynamicUpload: (
        files: File[] | FileWithParams[],
    ) => Promise<FileWithParams[] | undefined>
    isAddingMore: boolean
    setIsAddingMore: Dispatch<SetStateAction<boolean>>

    handleFileRemove: (fileId: string) => void
    handleDone: () => void
    handleCancel: () => void

    editingFile: FileWithParams | null
    openImageEditor: (file: FileWithParams) => void
    closeImageEditor: () => void
    saveImageEdit: (editedImageData: string, mimeType?: string) => void
    replaceFile: (fileId: string, newFile: FileWithParams) => void

    oneDriveConfigs?: OneDriveConfigs
    googleDriveConfigs?: GoogleDriveConfigs
    dropboxConfigs?: DropboxConfigs
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
