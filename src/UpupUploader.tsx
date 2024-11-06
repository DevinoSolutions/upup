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
import {
    BaseConfigs,
    GoogleConfigs,
    METHODS,
    OneDriveConfigs,
    UPLOAD_ADAPTER,
    UploadAdapter,
} from 'types'

import { AnimatePresence } from 'framer-motion'
import { v4 as uuidv4 } from 'uuid'
import useProgress from './hooks/useProgress'
import { getPresignedUrl } from 'lib/getPresignedUrl'

export interface UpupUploaderProps {
    baseConfigs: BaseConfigs
    uploadAdapters?: UPLOAD_ADAPTER[]
    presignedUrlEndpoint: string
    maxFilesSize?: number
    loader?: ReactElement
}

export type UploadFilesRef = {
    uploadFiles: () => Promise<string[] | null>
    dynamicUploadFiles: (files: File[]) => Promise<string[] | null>
}

/**
 *
 * @param baseConfigs base configurations
 * @param uploadAdapters the methods you want to enable for the user to upload the files. Default value is ['INTERNAL']
 * @param presignedUrlEndpoint pre-signed URL endpoint
 * @param maxFilesSize max files size
 * @param loader loader
 * @param ref referrer to the component instance to access its method uploadFiles from the parent component
 * @constructor
 */

// FIXME: replace any with the correct type for the ref later on
export const UpupUploader: FC<UpupUploaderProps & RefAttributes<any>> =
    forwardRef((props: UpupUploaderProps, ref: ForwardedRef<any>) => {
        const {
            baseConfigs,
            uploadAdapters = ['INTERNAL', 'LINK'],
            presignedUrlEndpoint,
            maxFilesSize,
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

        const { handler, progress } = useProgress(files)

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
                        filesList.forEach(file => checkFileType(file, accept))
                        if (maxFilesSize) {
                            const totalSize = filesList.reduce(
                                (acc, file) => acc + file.size,
                                0,
                            )
                            if (totalSize > maxFilesSize)
                                throw new Error(
                                    `Total file size must be less than ${
                                        maxFilesSize / 1024 / 1024
                                    } MB`,
                                )
                        }

                        // Compress files if needed
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

                        const keys: string[] = []

                        for (const file of processedFiles) {
                            if (!presignedUrlEndpoint)
                                throw new Error(
                                    'Pre-signed URL endpoint is required',
                                )

                            // Get pre-signed URL for each file
                            const presignedData = await getPresignedUrl(
                                presignedUrlEndpoint,
                                {
                                    fileName: file.name,
                                    fileType: file.type,
                                    fileSize: file.size,
                                },
                            )

                            // Upload file using pre-signed URL
                            const result = await uploadObject({
                                presignedUrl: presignedData.uploadUrl,
                                fields: presignedData.fields,
                                file,
                            })

                            if (result.httpStatusCode === 200)
                                keys.push(presignedData.key)
                            else throw new Error('Upload failed')
                        }

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
                    googleConfigs={baseConfigs as GoogleConfigs}
                    accept={accept}
                />
            ),
            [UploadAdapter.ONE_DRIVE]: (
                <OneDriveUploader
                    oneDriveConfigs={baseConfigs as OneDriveConfigs}
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
                        ).filter(file => checkFileType(file, accept))

                        setFiles(files =>
                            isAddingMore
                                ? [...files, ...acceptedFiles]
                                : [...acceptedFiles],
                        )

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
    })
