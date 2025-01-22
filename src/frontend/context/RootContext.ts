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
    OneDriveConfigs,
    UploadAdapter,
    UpupUploaderProps,
} from '../../shared/types'
import { UploadState } from '../lib/storage/provider'

interface FileWithId extends File {
    id?: string
}

export interface FileUploadState {
    status: UploadState
    progress: number
    error?: string
    retryCount: number
}

type UploadProps = {
    filesStates: Record<string, FileUploadState>
    startAllUploads: () => Promise<void>
    pauseUpload: (fileName: string) => void
    pauseAllUploads: () => void
    resumeUpload: (file: File) => void
    resumeAllUploads: () => Promise<void>
    retryFailedUpload: (file: File) => void
    retryAllFailedUploads: () => Promise<void>
}

export interface IRootContext {
    inputRef: RefObject<HTMLInputElement>
    activeAdapter?: UploadAdapter
    setActiveAdapter: Dispatch<SetStateAction<UploadAdapter | undefined>>

    files: File[]
    setFiles: (newFiles: File[], reset?: boolean) => void

    isAddingMore: boolean
    setIsAddingMore: Dispatch<SetStateAction<boolean>>

    handleFileRemove: (file: FileWithId) => void
    handleReset: () => void

    oneDriveConfigs?: OneDriveConfigs
    googleDriveConfigs?: GoogleDriveConfigs

    upload: UploadProps
    props: ContextProps
}
type ContextProps = Required<
    Omit<
        UpupUploaderProps,
        | 'loader'
        | 'driveConfigs'
        | 'onFilesSelected'
        | 'onPrepareFiles'
        | 'onFileRemove'
    >
> &
    Pick<UpupUploaderProps, 'onPrepareFiles'> & {
        loader: ReactElement
        multiple: boolean
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
