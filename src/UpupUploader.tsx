import {
    CameraUploader,
    GoogleDriveUploader,
    MetaVersion,
    OneDriveUploader,
    UrlUploader,
} from 'components'
import { UpupMini } from 'components/UpupMini'
import {
    DropZone,
    MethodsSelector,
    Preview,
    View,
} from 'components/UpupUploader'
import { useAddMore, useDragAndDrop } from 'hooks'
import {
    checkFileSize,
    checkFileType,
    compressFile,
    getClient,
    uploadObject,
} from 'lib'
import {
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
    useState,
} from 'react'
import {
    BaseConfigs,
    CloudStorageConfigs,
    GoogleConfigs,
    METHODS,
    OneDriveConfigs,
    UPLOAD_ADAPTER,
    UploadAdapter,
} from 'types'

import { AnimatePresence } from 'framer-motion'
import { FileWithId } from 'types/file'
import { v4 as uuidv4 } from 'uuid'
import useProgress from './hooks/useProgress'

export interface UpupUploaderProps {
    cloudStorageConfigs: CloudStorageConfigs
    baseConfigs: BaseConfigs
    uploadAdapters: UPLOAD_ADAPTER[]
    googleConfigs?: GoogleConfigs | undefined
    maxFilesSize?: number | undefined
    oneDriveConfigs?: OneDriveConfigs | undefined
    loader?: ReactElement | null
}

export type UploadFilesRef = {
    uploadFiles: () => Promise<string[] | null>
    dynamicUploadFiles: (files: File[]) => Promise<string[] | null>
}

// Add this helper function at the top level
const createFileWithId = (file: File) => {
    return Object.assign(file, {
        id: `${file.name}-${file.size}-${file.lastModified}-${Math.random()}`,
    })
}

/**
 *
 * @param cloudStorageConfigs cloud provider configurations
 * @param baseConfigs base configurations
 * @param toBeCompressed whether the user want to compress the file before uploading it or not. Default value is false
 * @param uploadAdapters the methods you want to enable for the user to upload the files. Default value is ['INTERNAL']
 * @param googleConfigs google configurations
 * @param oneDriveConfigs one drive configurations
 * @param ref referrer to the component instance to access its method uploadFiles from the parent component
 * @constructor
 */

// FIXME: replace any with the correct type for the ref later on
export const UpupUploader: FC<UpupUploaderProps & RefAttributes<any>> =
    forwardRef((props: UpupUploaderProps, ref: ForwardedRef<any>) => {
        const {
            cloudStorageConfigs,
            baseConfigs,
            uploadAdapters = ['INTERNAL', 'LINK'],
            googleConfigs,
            maxFilesSize,
            oneDriveConfigs,
            loader,
        } = props
        const { bucket, s3Configs } = cloudStorageConfigs
        const {
            toBeCompressed = false,
            onChange,
            multiple = false,
            accept = '*',
            limit,
            onFileClick,
            mini = false,
            onFilesChange,
            maxFileSize = { size: 20, unit: 'MB' },
            customMessage = 'Docs and Images',
        } = baseConfigs

        const [files, setFiles] = useState<FileWithId[]>([])
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
            files,
            onChange,
        )

        const { handler, progress } = useProgress(files)

        s3Configs.requestHandler = handler

        /**
         * Get the client instance
         */
        const client = getClient(s3Configs)

        /**
         * Check if file type is accepted
         * @param file File to check
         * @throws Error if file type is not accepted
         */
        const validateFileType = (file: File) => {
            if (!checkFileType(file, accept)) {
                const error = new Error(`File type ${file.type} not accepted`)
                baseConfigs?.onUploadFail?.(file, error)
                throw error
            }
        }

        /**
         * Check if file size is within limits
         * @param files Array of files to check
         * @throws Error if total file size exceeds limit
         */
        const validateFileSize = (files: File[]) => {
            if (maxFilesSize) {
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
                        file => baseConfigs?.onUploadFail?.(file, error),
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
            if (!toBeCompressed) return files

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
                    file => baseConfigs?.onUploadFail?.(file, error as Error),
                )
                throw error
            }
        }

        /**
         * Expose the handleUpload function to the parent component
         */
        useImperativeHandle(ref, () => ({
            async dynamicUploadFiles(dynamicFiles: File[]) {
                if (dynamicFiles.length === 0) return null
                return await this.proceedUpload(dynamicFiles)
            },
            async uploadFiles() {
                if (files.length === 0) return null
                const filesList =
                    mutatedFiles && mutatedFiles.length > 0
                        ? mutatedFiles
                        : files
                return await this.proceedUpload(filesList)
            },

            async proceedUpload(filesList: File[]) {
                return new Promise(async (resolve, reject) => {
                    try {
                        // Validate all files first
                        filesList.forEach(validateFileType)
                        validateFileSize(filesList)

                        // Notify upload start
                        filesList.forEach(file => {
                            baseConfigs?.onUpload?.(file)
                        })

                        // Compress files if needed
                        const processedFiles = await compressFiles(filesList)

                        const uploadPromises = processedFiles.map(
                            async file => {
                                const fileExtension = file.name.split('.').pop()
                                const key = `${Date.now()}__${uuidv4()}.${fileExtension}`

                                try {
                                    const result = await uploadObject({
                                        client,
                                        bucket,
                                        key,
                                        file,
                                    })

                                    if (result.httpStatusCode === 200) {
                                        baseConfigs?.onCompletedUpload?.(
                                            file,
                                            key,
                                        )
                                        return key
                                    } else {
                                        throw new Error('Upload failed')
                                    }
                                } catch (error) {
                                    baseConfigs?.onUploadFail?.(
                                        file,
                                        error as Error,
                                    )
                                    throw error
                                }
                            },
                        )

                        const keys = await Promise.all(uploadPromises)
                        baseConfigs?.onAllCompleted?.(keys)
                        resolve(keys)
                    } catch (error) {
                        reject(error)
                    }
                })
            },
        }))

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
                    setFiles={setFiles}
                    setView={setView}
                    googleConfigs={googleConfigs as GoogleConfigs}
                    accept={accept}
                />
            ),
            [UploadAdapter.ONE_DRIVE]: (
                <OneDriveUploader
                    oneDriveConfigs={oneDriveConfigs as OneDriveConfigs}
                    baseConfigs={baseConfigs}
                    setFiles={setFiles}
                    setView={setView}
                    loader={loader}
                />
            ),
            [UploadAdapter.LINK]: (
                <UrlUploader setFiles={setFiles} setView={setView} />
            ),
            [UploadAdapter.CAMERA]: (
                <CameraUploader setFiles={setFiles} setView={setView} />
            ),
        }

        useEffect(() => {
            const newFiles = files.filter(file =>
                checkFileSize(file, maxFileSize),
            )
            if (limit && newFiles.length > limit)
                setFiles(newFiles.slice(0, limit))
            // if files didn't change, no need to update the state
            else if (files.length === newFiles.length) return
            else setFiles([...newFiles])
        }, [limit, files, maxFileSize])

        useEffect(() => {
            if (!onFilesChange || files.length === 0) return setMutatedFiles([])
            const mutateFiles = async () =>
                setMutatedFiles(await onFilesChange([...files]))

            mutateFiles()
        }, [files])

        // Modify the input onChange handler to include validation
        const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
            try {
                const newFiles = Array.from(e.target.files || [])
                newFiles.forEach(validateFileType)
                validateFileSize(newFiles)

                const acceptedFiles = newFiles.map(createFileWithId)
                setFiles(files =>
                    isAddingMore ? [...files, ...acceptedFiles] : acceptedFiles,
                )
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
                setFiles(prevFiles => {
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
                    setFiles(prevFiles => {
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
            setFiles(prev => prev.filter(f => f !== file))
            baseConfigs?.onFileRemove?.(file)
        }

        return mini ? (
            <UpupMini
                files={files}
                setFiles={setFiles}
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
                            : files
                    }
                    setFiles={setFiles}
                    isAddingMore={isAddingMore}
                    setIsAddingMore={setIsAddingMore}
                    multiple={multiple}
                    onFileClick={onFileClick}
                    progress={progress}
                    limit={limit}
                    handleFileRemove={handleFileRemove}
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
    })
