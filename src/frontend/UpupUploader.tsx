import { AnimatePresence } from 'framer-motion'
import React, {
    Dispatch,
    FC,
    ForwardedRef,
    LegacyRef,
    ReactElement,
    RefAttributes,
    SetStateAction,
    forwardRef,
    useEffect,
    useImperativeHandle,
    useMemo,
    useState,
} from 'react'
import { v4 as uuidv4 } from 'uuid'
import checkFileType from '../shared/lib/checkFileType'
import {
    CameraUploader,
    GoogleDriveUploader,
    MetaVersion,
    OneDriveUploader,
    UrlUploader,
} from './components'
import { UpupMini } from './components/UpupMini'
import {
    DropZone,
    MethodsSelector,
    Preview,
    View,
} from './components/UpupUploader'
import { useAddMore, useDragAndDrop } from './hooks'
import { checkFileSize, compressFile, sizeToBytes } from './lib'
import { ProviderSDK } from './lib/storage/provider'
import {
    BaseConfigs,
    GoogleConfigs,
    METHODS,
    OneDriveConfigs,
    UPLOAD_ADAPTER,
    UploadAdapter,
} from './types'
import { FileWithId } from './types/file'
import { StorageConfig } from './types/StorageSDK'

export interface UpupUploaderProps {
    storageConfig: StorageConfig
    baseConfigs: BaseConfigs
    uploadAdapters: UPLOAD_ADAPTER[]
    googleConfigs?: GoogleConfigs
    oneDriveConfigs?: OneDriveConfigs
    loader?: ReactElement | null
}

export interface UploadFilesRef {
    uploadFiles: () => Promise<string[] | null>
    dynamicUploadFiles: (files: File[]) => Promise<string[] | null>
}

type FileProgress = {
    id: string
    loaded: number
    total: number
}

type FilesProgressMap = Record<string, FileProgress>

// Add this helper function at the top level
const createFileWithId = (file: File) => {
    return Object.assign(file, {
        id: `${file.name}-${file.size}-${file.lastModified}-${uuidv4()}`,
    })
}

/**
 *
 * @param storageConfig storage configuration
 * @param baseConfigs base configurations
 * @param uploadAdapters the methods you want to enable for the user to upload the files. Default value is ['INTERNAL']
 * @param googleConfigs google configurations
 * @param oneDriveConfigs one drive configurations
 * @param loader loader
 * @param ref referrer to the component instance to access its method uploadFiles from the parent component
 * @constructor
 */

// FIXME: replace any with the correct type for the ref later on
export const UpupUploader: FC<
    UpupUploaderProps & RefAttributes<UploadFilesRef>
> = forwardRef(
    (props: UpupUploaderProps, ref: ForwardedRef<UploadFilesRef>) => {
        const {
            storageConfig,
            baseConfigs,
            uploadAdapters = ['INTERNAL', 'LINK'],
            googleConfigs,
            oneDriveConfigs,
            loader,
        } = props
        const {
            shouldCompress = false,
            onFilesSelected,
            multiple = false,
            accept = '*',
            limit,
            onFileClick,
            mini = false,
            onPrepareFiles,
            maxFileSize = { size: 20, unit: 'MB' },
            customMessage = 'Docs and Images',
        } = baseConfigs

        const [selectedFiles, setSelectedFiles] = useState<File[]>([])
        const [mutatedFiles, setMutatedFiles] = useState<FileWithId[]>([])
        const [view, setView] = useState('internal')

        const {
            isDragging,
            setIsDragging,
            handleDragEnter,
            handleDragLeave,
            containerRef,
        } = useDragAndDrop()

        const { isAddingMore, setIsAddingMore, inputRef } = useAddMore(
            selectedFiles,
            onFilesSelected,
        )

        const [filesProgressMap, setFilesProgressMap] =
            useState<FilesProgressMap>({} as FilesProgressMap)
        useEffect(() => {
            setFilesProgressMap(
                selectedFiles.reduce((a, b) => {
                    a[b.name] = {
                        id: b.name,
                        loaded: 0,
                        total: b.size,
                    }
                    return a
                }, {} as FilesProgressMap),
            )
        }, [selectedFiles.length])

        const progress = useMemo(() => {
            const filesProgressMapValues = Object.values(filesProgressMap)
            if (!filesProgressMapValues.length) return 0

            const loadedValues = filesProgressMapValues.reduce(
                (a, b) => a + (b.loaded / b.total) * 100,
                0,
            )
            return loadedValues / filesProgressMapValues.length
        }, [filesProgressMap])

        /**
         * Check if file type is accepted
         * @param file File to check
         * @throws Error if file type is not accepted
         */
        const validateFileType = (file: File) => {
            if (!checkFileType(accept, file, baseConfigs.onFileTypeMismatch)) {
                const error = new Error(`File type ${file.type} not accepted`)
                baseConfigs.onFileUploadFail?.(file, error)
                throw error
            }
        }

        /**
         * Check if file size is within limits
         * @param files Array of files to check
         * @throws Error if total file size exceeds limit
         */
        const validateFileSize = (files: File[]) => {
            if (maxFileSize) {
                const maxFilesSize = sizeToBytes(
                    maxFileSize.size,
                    maxFileSize.unit,
                )
                const totalSize = files.reduce(
                    (acc, file) => acc + file.size,
                    0,
                )
                if (totalSize > maxFilesSize) {
                    const error = new Error(
                        `Total file size must be less than ${
                            maxFilesSize / 1024 / 1024
                        }MB`,
                    )
                    files.forEach(
                        file => baseConfigs.onFileUploadFail?.(file, error),
                    )
                    throw error
                }
            }
        }

        /**
         * Compress files if compression is enabled
         * @param files Array of files to compress
         * @returns Promise<File[]> Compressed files
         */
        const compressFiles = async (files: File[]): Promise<File[]> => {
            if (!shouldCompress) return files

            try {
                return await Promise.all(
                    files.map(async file => {
                        const compressed = await compressFile({
                            element: file,
                            element_name: file.name,
                        })
                        return compressed
                    }),
                )
            } catch (error) {
                files.forEach(
                    file =>
                        baseConfigs.onFileUploadFail?.(file, error as Error),
                )
                throw error
            }
        }

        /**
         * Expose the handleUpload function to the parent component
         */

        useImperativeHandle(ref, () => {
            const proceedUpload = async (
                filesList: File[],
            ): Promise<string[]> => {
                return new Promise(async (resolve, reject) => {
                    try {
                        // Validate files
                        filesList.forEach(validateFileType)
                        validateFileSize(filesList)

                        // Process files (compression if needed)
                        const processedFiles = shouldCompress
                            ? await compressFiles(filesList)
                            : filesList

                        const config = {
                            ...storageConfig,
                            constraints: {
                                multiple,
                                accept,
                                maxFileSize: sizeToBytes(
                                    maxFileSize.size,
                                    maxFileSize.unit,
                                ),
                            },
                        }
                        // Initialize SDK
                        let sdk = new ProviderSDK(config)

                        // Upload files
                        const uploadResults = await Promise.all(
                            processedFiles.map(file =>
                                sdk.upload(file, {
                                    onFileUploadStart:
                                        baseConfigs.onFileUploadStart,
                                    onFileUploadProgress: (file, progress) => {
                                        setFilesProgressMap(prev => ({
                                            ...prev,
                                            [file.name]: {
                                                ...prev[file.name],
                                                loaded: progress.loaded,
                                            },
                                        }))
                                        baseConfigs.onFileUploadProgress?.(
                                            file,
                                            progress,
                                        )
                                    },
                                    onFileUploadComplete:
                                        baseConfigs.onFileUploadComplete,
                                    onFileUploadFail:
                                        baseConfigs.onFileUploadFail,
                                    onTotalUploadProgress: (
                                        completedFiles: number,
                                    ) =>
                                        baseConfigs.onTotalUploadProgress?.(
                                            completedFiles,
                                            processedFiles.length,
                                        ),
                                }),
                            ),
                        )

                        // Extract keys from results
                        const uploadedFileKeys = uploadResults.map(
                            result => result.key,
                        )
                        baseConfigs.onAllUploadsComplete?.(uploadedFileKeys)
                        resolve(uploadedFileKeys)
                    } catch (error) {
                        reject(error)
                    }
                })
            }

            const returnValue: UploadFilesRef = {
                async dynamicUploadFiles(
                    dynamicFiles: File[],
                ): Promise<string[] | null> {
                    if (dynamicFiles.length === 0) return null
                    return await proceedUpload(dynamicFiles)
                },
                async uploadFiles(): Promise<string[] | null> {
                    if (selectedFiles.length === 0) return null
                    const filesList =
                        mutatedFiles && mutatedFiles.length > 0
                            ? mutatedFiles
                            : selectedFiles
                    return await proceedUpload(filesList)
                },
            }

            return returnValue
        })

        /**
         * Check if the user selected at least one upload adapter
         */
        if (uploadAdapters.length === 0) {
            throw new Error('Please select at least one upload adapter')
        }

        /**
         *  Define the components to be rendered based on the user selection of
         *  the upload adapters (internal, google drive, one drive)
         */
        const components = {
            [UploadAdapter.GOOGLE_DRIVE]: (
                <GoogleDriveUploader
                    setFiles={setSelectedFiles}
                    setView={setView}
                    googleConfigs={googleConfigs as GoogleConfigs}
                    accept={accept}
                />
            ),
            [UploadAdapter.ONE_DRIVE]: (
                <OneDriveUploader
                    oneDriveConfigs={oneDriveConfigs as OneDriveConfigs}
                    baseConfigs={baseConfigs}
                    setFiles={setSelectedFiles}
                    setView={setView}
                    loader={loader}
                />
            ),
            [UploadAdapter.LINK]: (
                <UrlUploader setFiles={setSelectedFiles} setView={setView} />
            ),
            [UploadAdapter.CAMERA]: (
                <CameraUploader setFiles={setSelectedFiles} setView={setView} />
            ),
        }

        useEffect(() => {
            const newFiles = selectedFiles.filter(file =>
                checkFileSize(file, maxFileSize),
            )
            if (limit && newFiles.length > limit)
                setSelectedFiles(newFiles.slice(0, limit))
            // if files didn't change, no need to update the state
            else if (selectedFiles.length === newFiles.length) return
            else setSelectedFiles([...newFiles])
        }, [limit, selectedFiles, maxFileSize])

        useEffect(() => {
            if (!onPrepareFiles || selectedFiles.length === 0)
                return setMutatedFiles([])
            const mutateFiles = async () =>
                setMutatedFiles(await onPrepareFiles([...selectedFiles]))

            mutateFiles()
        }, [selectedFiles])

        // Modify the input onChange handler to include validation
        const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
            try {
                let acceptedFiles = Array.from(e.target.files || []).filter(
                    file =>
                        checkFileType(
                            accept,
                            file,
                            baseConfigs.onFileTypeMismatch,
                        ),
                )
                validateFileSize(acceptedFiles)

                acceptedFiles = acceptedFiles.map(createFileWithId)

                const newFiles = multiple
                    ? isAddingMore
                        ? [...selectedFiles, ...acceptedFiles]
                        : acceptedFiles
                    : [acceptedFiles[0]].filter(Boolean)
                setSelectedFiles(newFiles)
            } catch (error) {
                console.error(error)
                // Don't set files if validation fails
            } finally {
                e.target.value = ''
            }
        }

        // Modify the DropZone handler to include validation and maintain existing files
        const handleDropzoneFiles: Dispatch<
            SetStateAction<File[]>
        > = filesOrUpdater => {
            if (typeof filesOrUpdater === 'function') {
                setSelectedFiles(prevFiles => {
                    try {
                        const updatedFiles = filesOrUpdater(prevFiles)
                        const newFiles = updatedFiles.slice(prevFiles.length)

                        // Validate only new files
                        newFiles.forEach(validateFileType)
                        validateFileSize([...prevFiles, ...newFiles])

                        const filesWithIds = newFiles.map(createFileWithId)
                        return [...prevFiles, ...filesWithIds]
                    } catch (error) {
                        console.error(error)
                        return prevFiles
                    }
                })
            } else {
                try {
                    filesOrUpdater.forEach(validateFileType)
                    setSelectedFiles(prevFiles => {
                        try {
                            validateFileSize([...prevFiles, ...filesOrUpdater])
                            const filesWithIds =
                                filesOrUpdater.map(createFileWithId)
                            return [...prevFiles, ...filesWithIds]
                        } catch (error) {
                            console.error(error)
                            return prevFiles
                        }
                    })
                } catch (error) {
                    console.error(error)
                }
            }
        }

        // Add file removal handler
        const handleFileRemove = (file: FileWithId) => {
            setSelectedFiles(prev => prev.filter(f => f !== file))
            baseConfigs.onFileRemove?.(file)
        }

        return mini ? (
            <UpupMini
                files={selectedFiles}
                setFiles={setSelectedFiles}
                maxFileSize={maxFileSize}
                handleFileRemove={handleFileRemove}
                baseConfigs={baseConfigs}
            />
        ) : (
            <div
                className="relative flex h-[min(98svh,35rem)] w-full max-w-[min(98svh,46rem)] select-none flex-col overflow-hidden rounded-md border bg-[#f4f4f4] dark:bg-[#1f1f1f]"
                onDragEnter={handleDragEnter}
                onDragLeave={handleDragLeave}
                ref={containerRef as LegacyRef<HTMLDivElement>}
            >
                <AnimatePresence>
                    {isDragging && (
                        <DropZone
                            setFiles={handleDropzoneFiles}
                            setIsDragging={setIsDragging}
                            multiple={multiple}
                            accept={accept}
                            baseConfigs={baseConfigs}
                        />
                    )}
                </AnimatePresence>
                <input
                    type="file"
                    accept={accept}
                    className="absolute h-0 w-0"
                    ref={inputRef}
                    multiple={multiple}
                    onChange={handleFileChange}
                />

                <View
                    view={view}
                    setView={setView}
                    methods={METHODS}
                    components={components}
                />

                <Preview
                    files={
                        mutatedFiles && mutatedFiles.length > 0
                            ? mutatedFiles
                            : selectedFiles
                    }
                    setFiles={setSelectedFiles}
                    isAddingMore={isAddingMore}
                    setIsAddingMore={setIsAddingMore}
                    multiple={multiple}
                    onFileClick={onFileClick}
                    progress={progress}
                    limit={limit}
                    handleFileRemove={handleFileRemove}
                    onCancelUpload={baseConfigs.onCancelUpload}
                />
                <div className="h-full p-2">
                    <div className="grid h-full w-full grid-rows-[1fr,auto] place-items-center rounded-md border border-dashed border-[#dfdfdf] transition-all">
                        <MethodsSelector
                            setView={setView}
                            inputRef={inputRef}
                            methods={METHODS.filter(method => {
                                return uploadAdapters.includes(method.id as any)
                            })}
                            baseConfigs={baseConfigs}
                        />
                        <MetaVersion
                            customMessage={customMessage}
                            maxFileSize={maxFileSize}
                            limit={limit}
                        />
                    </div>
                </div>
            </div>
        )
    },
)
