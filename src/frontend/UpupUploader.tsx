import {
    CameraUploader,
    GoogleDriveUploader,
    MetaVersion,
    OneDriveUploader,
    UrlUploader,
} from 'frontend/components'
import { UpupMini } from 'frontend/components/UpupMini'
import {
    DropZone,
    MethodsSelector,
    Preview,
    View,
} from 'frontend/components/UpupUploader'
import { useAddMore, useDragAndDrop } from 'frontend/hooks'
import { checkFileSize, compressFile, sizeToBytes } from 'frontend/lib'
import {
    BaseConfigs,
    GoogleConfigs,
    METHODS,
    OneDriveConfigs,
    UPLOAD_ADAPTER,
    UploadAdapter,
} from 'frontend/types'
import React, {
    FC,
    ForwardedRef,
    LegacyRef,
    ReactElement,
    RefAttributes,
    forwardRef,
    useEffect,
    useImperativeHandle,
    useState,
} from 'react'

import { AnimatePresence } from 'framer-motion'
import { ProviderSDK } from 'frontend/lib/storage/provider'
import { StorageConfig } from 'frontend/types/StorageSDK'
import checkFileType from 'shared/lib/checkFileType'
import useProgress from './hooks/useProgress'

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

        const [files, setFiles] = useState<File[]>([])
        const [mutatedFiles, setMutatedFiles] = useState<File[]>([])
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

        const { progress } = useProgress(files)

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
                        filesList.forEach(file =>
                            checkFileType(accept, file.type),
                        )

                        // Process files (compression if needed)
                        const processedFiles = toBeCompressed
                            ? await Promise.all(
                                  filesList.map(file =>
                                      compressFile({
                                          element: file,
                                          element_name: file.name,
                                      }),
                                  ),
                              )
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
                                    onProgress: console.log,
                                }),
                            ),
                        )

                        // Extract keys from results
                        const keys = uploadResults.map(result => result.key)
                        resolve(keys)
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
                    if (files.length === 0) return null
                    const filesList =
                        mutatedFiles && mutatedFiles.length > 0
                            ? mutatedFiles
                            : files
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

        return mini ? (
            <UpupMini
                files={files}
                setFiles={setFiles}
                maxFileSize={maxFileSize}
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
                            setFiles={setFiles}
                            setIsDragging={setIsDragging}
                            multiple={multiple}
                            accept={accept}
                        />
                    )}
                </AnimatePresence>
                <input
                    type="file"
                    accept={accept}
                    className="absolute h-0 w-0"
                    ref={inputRef}
                    multiple={multiple}
                    onChange={e => {
                        const acceptedFiles = Array.from(
                            e.target.files as FileList,
                        ).filter(file => checkFileType(accept, file.type))

                        const newFiles = multiple
                            ? isAddingMore
                                ? [...files, ...acceptedFiles]
                                : acceptedFiles
                            : [acceptedFiles[0]].filter(Boolean)
                        setFiles(newFiles)

                        // clear the input value
                        e.target.value = ''
                    }}
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
                />
                <div className="h-full p-2">
                    <div className="grid h-full w-full grid-rows-[1fr,auto] place-items-center rounded-md border border-dashed border-[#dfdfdf] transition-all">
                        <MethodsSelector
                            setView={setView}
                            inputRef={inputRef}
                            methods={METHODS.filter(method => {
                                return uploadAdapters.includes(method.id as any)
                            })}
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
