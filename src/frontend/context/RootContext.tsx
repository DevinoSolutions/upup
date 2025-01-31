import React, {
    createContext,
    Dispatch,
    PropsWithChildren,
    ReactElement,
    RefObject,
    SetStateAction,
    useContext,
    useRef,
    useState,
} from 'react'
import checkFileType from '../../shared/lib/checkFileType'
import {
    GoogleDriveConfigs,
    MaxFileSizeObject,
    OneDriveConfigs,
    UploadAdapter,
    UpupUploaderProps,
} from '../../shared/types'
import { checkFileSize, fileAppendId, getUniqueFilesByName } from '../lib/file'

interface FileWithId extends File {
    id?: string
}

interface IRootContext {
    inputRef: RefObject<HTMLInputElement>
    view: UploadAdapter
    setView: Dispatch<SetStateAction<UploadAdapter>>

    files: File[]
    setFiles: (newFiles: File[], reset?: boolean) => void

    isAddingMore: boolean
    setIsAddingMore: Dispatch<SetStateAction<boolean>>

    handleFileRemove: (file: FileWithId) => void

    oneDriveConfigs?: OneDriveConfigs
    googleDriveConfigs?: GoogleDriveConfigs

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
    customMessage: string
    maxFileSize: MaxFileSizeObject
    limit: number
    multiple: boolean
    mini: boolean
}

const RootContext = createContext<IRootContext>({} as IRootContext)

export function RootProvider({
    accept = '*',
    mini = false,
    limit: propLimit = 1,
    maxFileSize = { size: 10, unit: 'MB' },
    loader = <p>loading...</p>,
    customMessage = 'Docs and Images',
    shouldCompress = false,
    uploadAdapters = [UploadAdapter.INTERNAL, UploadAdapter.LINK],
    onError = console.error,
    onIntegrationClick = () => {},
    onFileClick = () => {},
    onCancelUpload = () => {},
    onFileRemove = () => {},
    onFileDragOver = () => {},
    onFileDragLeave = () => {},
    onFileDrop = () => {},
    onFileTypeMismatch = () => {},
    onFileUploadStart = () => {},
    onFileUploadProgress = () => {},
    onFilesUploadProgress = () => {},
    onFileUploadComplete = () => {},
    onFilesUploadComplete = () => {},
    onFilesSelected = () => {},
    onPrepareFiles,
    provider,
    tokenEndpoint,
    driveConfigs,
    children,
}: PropsWithChildren<UpupUploaderProps>) {
    const inputRef = useRef<HTMLInputElement>(null)
    const [selectedFiles, setSelectedFiles] = useState<File[]>([])
    const [isAddingMore, setIsAddingMore] = useState(false)
    const [view, setView] = useState(UploadAdapter.INTERNAL)
    const limit = mini ? 1 : propLimit
    const multiple = mini ? false : limit > 1

    const handleSetSelectedFiles = (newFiles: File[], reset = false) => {
        onFilesSelected(newFiles)
        if (reset) return setSelectedFiles([])

        const validFilesByType = newFiles.filter(file =>
            checkFileType(accept, file, onFileTypeMismatch),
        )
        const validFilesBySize = validFilesByType.filter(file =>
            checkFileSize(file, maxFileSize),
        )

        const filesWithIds = validFilesBySize.map(fileAppendId)
        if (filesWithIds.length)
            setSelectedFiles(prev =>
                multiple
                    ? getUniqueFilesByName([...prev, ...filesWithIds]).slice(
                          0,
                          limit,
                      )
                    : [filesWithIds[0]],
            )

        setIsAddingMore(false)
    }

    const handleFileRemove = (file: FileWithId) => {
        setSelectedFiles(prev => prev.filter(f => f.name !== file.name))
        onFileRemove(file)
    }

    return (
        <RootContext.Provider
            value={{
                inputRef,
                view,
                setView,
                isAddingMore,
                setIsAddingMore,
                files: selectedFiles,
                setFiles: handleSetSelectedFiles,
                handleFileRemove,
                oneDriveConfigs: driveConfigs?.oneDrive,
                googleDriveConfigs: driveConfigs?.googleDrive,
                props: {
                    mini,
                    loader,
                    onError,
                    onIntegrationClick,
                    onFileClick,
                    onCancelUpload,
                    onFileDragOver,
                    onFileDragLeave,
                    onFileDrop,
                    onFileTypeMismatch,
                    uploadAdapters,
                    accept,
                    customMessage,
                    maxFileSize,
                    limit,
                    multiple,

                    shouldCompress,
                    provider,
                    tokenEndpoint,
                    onFileUploadStart,
                    onFileUploadProgress,
                    onFilesUploadProgress,
                    onFileUploadComplete,
                    onFilesUploadComplete,
                    onPrepareFiles,
                },
            }}
        >
            {children}
        </RootContext.Provider>
    )
}

export function useRootContext() {
    const contextValue = useContext(RootContext)
    return contextValue
}

export default RootContext
