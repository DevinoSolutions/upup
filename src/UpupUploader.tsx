import {
    FC,
    ForwardedRef,
    forwardRef,
    LegacyRef,
    RefAttributes,
    useEffect,
    useImperativeHandle,
    useState,
} from 'react'
import { OneDriveConfigs } from 'types/OneDriveConfigs'
import { GoogleDriveUploader } from 'components/GoogleDriveUploader'
import OneDriveUploader from 'components/OneDriveUploader'
import { CloudStorageConfigs } from 'types/CloudStorageConfigs'
import { BaseConfigs } from 'types/BaseConfigs'
import { GoogleConfigs } from 'types/GoogleConfigs'
import { getClient } from 'lib/getClient'
import { UPLOAD_ADAPTER, UploadAdapter } from 'types/UploadAdapter'
import {
    BoxIcon,
    CameraIcon,
    DropBoxIcon,
    GoogleDriveIcon,
    LinkIcon,
    MyDeviceIcon,
    OneDriveIcon,
    UnsplashIcon,
} from 'components/Icons'
import View from 'components/UpupUploader/View'
import MethodsSelector from 'components/UpupUploader/MethodSelector'
import Preview from 'components/UpupUploader/Preview'
import DropZone from 'components/UpupUploader/DropZone'
import { AnimatePresence } from 'framer-motion'
import UrlUploader from 'components/UrlUploader'
import CameraUploader from 'components/CameraUploader'
import useDragAndDrop from 'hooks/useDragAndDrop'
import useAddMore from 'hooks/useAddMore'
import { compressFile } from 'lib/compressFile'
import { putObject } from 'lib/putObject'
import { Method } from 'types/Method'

const methods: Method[] = [
    { id: 'INTERNAL', name: 'My Device', icon: <MyDeviceIcon /> },
    { id: 'GOOGLE_DRIVE', name: 'Google Drive', icon: <GoogleDriveIcon /> },
    { id: 'ONE_DRIVE', name: 'OneDrive', icon: <OneDriveIcon /> },
    { id: 'BOX', name: 'Box', icon: <BoxIcon /> },
    { id: 'LINK', name: 'Link', icon: <LinkIcon /> },
    { id: 'CAMERA', name: 'Camera', icon: <CameraIcon /> },
    { id: 'DROPBOX', name: 'Dropbox', icon: <DropBoxIcon /> },
    { id: 'UNSPLASH', name: 'Unsplash', icon: <UnsplashIcon /> },
]

export interface UpupUploaderProps {
    cloudStorageConfigs: CloudStorageConfigs
    baseConfigs: BaseConfigs
    uploadAdapters: UPLOAD_ADAPTER[]
    googleConfigs?: GoogleConfigs | undefined
    oneDriveConfigs?: OneDriveConfigs | undefined
}

export type UploadFilesRef = {
    uploadFiles: () => Promise<string[] | []>
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

export const UpupUploader: FC<UpupUploaderProps & RefAttributes<any>> =
    forwardRef((props: UpupUploaderProps, ref: ForwardedRef<any>) => {
        const {
            cloudStorageConfigs,
            baseConfigs,
            uploadAdapters = ['INTERNAL', 'LINK'],
            googleConfigs,
            oneDriveConfigs,
        } = props
        const { bucket, s3Configs } = cloudStorageConfigs
        const {
            toBeCompressed = false,
            onChange,
            multiple = false,
            accept = '*',
            limit,
        } = baseConfigs

        const [files, setFiles] = useState<File[]>([])
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

        /**
         * Get the client instance
         */
        const client = getClient(s3Configs)

        /**
         * Expose the handleUpload function to the parent component
         */
        useImperativeHandle(ref, () => ({
            async uploadFiles() {
                if (files.length === 0) return null
                return new Promise(async (resolve, reject) => {
                    /**
                     * Upload the file to the cloud storage
                     */
                    let filesToUpload: File[]
                    let keys: string[] = []

                    /**
                     * Compress the file before uploading it to the cloud storage
                     */
                    if (toBeCompressed)
                        filesToUpload = await Promise.all(
                            files.map(async file => {
                                /**
                                 * Compress the file
                                 */
                                return await compressFile({
                                    element: file,
                                    element_name: file.name,
                                })
                            }),
                        )
                    else filesToUpload = files

                    /**
                     * Loop through the files array and upload the files
                     */

                    if (filesToUpload) {
                        try {
                            filesToUpload.map(async file => {
                                /**
                                 * assign a unique name for the file, usually has a timestamp prefix
                                 */
                                const key = `${Date.now()}__${file.name}`

                                /**
                                 * Upload the file to the cloud storage
                                 */
                                await putObject({
                                    client,
                                    bucket,
                                    key,
                                    file,
                                })
                                    .then(() => {
                                        keys.push(key)
                                    })
                                    .catch(err => {
                                        throw new Error(err.message)
                                    })
                            })
                            resolve(keys) // return the keys to the parent component
                        } catch (error) {
                            if (error instanceof Error) {
                                // ✅ TypeScript knows err is Error
                                reject(new Error(error.message))
                            } else {
                                reject(new Error('Something went wrong'))
                            }
                        }
                    } else reject(undefined)
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
                    googleConfigs={googleConfigs as GoogleConfigs}
                    baseConfigs={baseConfigs}
                    setFiles={setFiles}
                    setView={setView}
                />
            ),
            [UploadAdapter.ONE_DRIVE]: (
                <OneDriveUploader
                    oneDriveConfigs={oneDriveConfigs as OneDriveConfigs}
                    baseConfigs={baseConfigs}
                    setFiles={setFiles}
                    setView={setView}
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
            if (!limit) return

            const difference = files.length - limit

            if (difference <= 0) return

            const newFiles = files.slice(difference)
            setFiles([...newFiles])
        }, [limit, files])

        return (
            <div
                className="w-full max-w-[min(98svh,46rem)] bg-[#f4f4f4] h-[min(98svh,35rem)] rounded-md border flex flex-col relative overflow-hidden select-none dark:bg-[#1f1f1f]"
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
                        />
                    )}
                </AnimatePresence>
                <input
                    type="file"
                    accept={accept}
                    className="absolute w-0 h-0"
                    ref={inputRef}
                    multiple={multiple}
                    onChange={e =>
                        setFiles(files =>
                            isAddingMore
                                ? [
                                      ...files,
                                      ...Array.from(e.target.files as FileList),
                                  ]
                                : [...Array.from(e.target.files as FileList)],
                        )
                    }
                />

                <View
                    view={view}
                    setView={setView}
                    methods={methods}
                    components={components}
                />
                <Preview
                    files={files}
                    setFiles={setFiles}
                    isAddingMore={isAddingMore}
                    setIsAddingMore={setIsAddingMore}
                    multiple={multiple}
                    // handleUpload={handleUpload}
                />
                <div className="p-2 h-full">
                    <div className="border-[#dfdfdf] border-dashed h-full w-full grid grid-rows-[1fr,auto] place-items-center border rounded-md transition-all">
                        <MethodsSelector
                            setView={setView}
                            inputRef={inputRef}
                            methods={methods.filter(method => {
                                return uploadAdapters.includes(method.id as any)
                            })}
                        />
                        <p className="text-xs text-[#9d9d9d] mb-4">
                            Powered by uNotes
                        </p>
                    </div>
                </div>
            </div>
        )
    })
