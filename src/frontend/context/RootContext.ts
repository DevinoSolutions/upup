import {
    createContext,
    Dispatch,
    ReactElement,
    RefObject,
    SetStateAction,
    useContext,
} from 'react'
import {
    GoogleDriveConfigs,
    MaxFileSizeObject,
    OneDriveConfigs,
    UploadAdapter,
    UpupUploaderProps,
} from '../../shared/types'
import { FilesProgressMap } from '../hooks/useRootProvider'

interface FileWithId extends File {
    id?: string
}

type UploadProps = {
    isUploading: boolean
    totalProgress: number
    filesProgressMap: FilesProgressMap
    proceedUpload: () => Promise<string[] | undefined>
}

interface IRootContext {
    inputRef: RefObject<HTMLInputElement>
    view: UploadAdapter
    setView: Dispatch<SetStateAction<UploadAdapter>>

    files: File[]
    setFiles: (newFiles: File[], reset?: boolean) => void

    handleFileRemove: (file: FileWithId) => void

    oneDriveConfigs?: OneDriveConfigs
    googleDriveConfigs?: GoogleDriveConfigs

    upload: UploadProps
    props: ContextProps
}
type ContextProps = Pick<
    UpupUploaderProps,
    'provider' | 'tokenEndpoint' | 'onPrepareFiles'
> & {
    loader: ReactElement

    onError: (errorMessage: string) => void
    onIntegrationClick: (integrationType: string) => void
    onFileClick: (file: File) => void
    onCancelUpload: (files: File[]) => void
    onFileDragOver: (files: File[]) => void
    onFileDragLeave: (files: File[]) => void
    onFileDrop: (files: File[]) => void
    onFileTypeMismatch: (file: File, acceptedTypes: string) => void
    onFileUploadStart: (file: File) => void
    onFileUploadProgress: (
        file: File,
        {
            loaded,
            total,
            percentage,
        }: { loaded: number; total: number; percentage: number },
    ) => void
    onFilesUploadProgress: (completedFiles: number, totalFiles: number) => void
    onFileUploadComplete: (file: File, key: string) => void
    onFilesUploadComplete: (keys: string[]) => void
    uploadAdapters: UploadAdapter[]

    shouldCompress: boolean
    accept: string
    maxFileSize: MaxFileSizeObject
    limit: number
    multiple: boolean
    mini: boolean
}

const RootContext = createContext<IRootContext>({
    props: {},
    files: [] as File[],
} as IRootContext)

export function useRootContext() {
    const contextValue = useContext(RootContext)
    return contextValue
}

export default RootContext
