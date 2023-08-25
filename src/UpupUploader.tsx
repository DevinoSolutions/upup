import React, {
    FC,
    ForwardedRef,
    forwardRef,
    LegacyRef,
    RefAttributes,
    useEffect,
    useImperativeHandle,
    useRef,
    useState,
} from 'react'
import { OneDriveConfigs } from './types/OneDriveConfigs'
import { GoogleDriveUploader } from './components/GoogleDriveUploader'
import OneDriveUploader from './components/OneDriveUploader'
import { CloudStorageConfigs } from './types/CloudStorageConfigs'
import { BaseConfigs } from './types/BaseConfigs'
import { GoogleConfigs } from './types/GoogleConfigs'
import { getClient } from './lib/getClient'
import { UPLOAD_ADAPTER, UploadAdapter } from './types/UploadAdapter'
import { compressFile } from './lib/compressFile'
import { putObject } from './lib/putObject'
import {
    CameraIcon,
    DropBoxIcon,
    GoogleDriveIcon,
    LinkIcon,
    MyDeviceIcon,
    OneDriveIcon,
    UnsplashIcon,
} from './components/Icons'
import View from './components/UpupUploader/View'
import MethodsSelector from './components/UpupUploader/MethodSelector'
import Preview from './components/UpupUploader/Preview'
import DropZone from './components/UpupUploader/DropZone'
import { AnimatePresence } from 'framer-motion'
import UrlUploader from './components/UrlUploader'
import CameraUploader from './components/CameraUploader'
import useDragAndDrop from './hooks/useDragAndDrop'

const methods = [
    { id: 'internal', name: 'My Device', icon: <MyDeviceIcon /> },
    { id: 'GOOGLE_DRIVE', name: 'Google Drive', icon: <GoogleDriveIcon /> },
    { id: 'ONE_DRIVE', name: 'OneDrive', icon: <OneDriveIcon /> },
    // { id: 'box', name: 'Box', icon: <BoxIcon /> },
    { id: 'LINK', name: 'Link', icon: <LinkIcon /> },
    { id: 'CAMERA', name: 'Camera', icon: <CameraIcon /> },
    { id: 'dropbox', name: 'Dropbox', icon: <DropBoxIcon /> },
    { id: 'unsplash', name: 'Unsplash', icon: <UnsplashIcon /> },
    // { id: 'facebook', name: 'Facebook', icon: <FacebookIcon /> },
    // { id: 'instagram', name: 'Instagram', icon: <InstagramIcon /> },
    // { id: 'audio', name: 'Audio', icon: <AudioIcon /> },
    // { id: 'screencast', name: 'ScreenCast', icon: <ScreenCastIcon /> },
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
 * @param uploadAdapters whether the user want to upload files from internal storage or Google drive or both
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
            uploadAdapters,
            googleConfigs,
            oneDriveConfigs,
        } = props
        const { bucket, s3Configs } = cloudStorageConfigs
        const { toBeCompressed = false, onChange } = baseConfigs

        const [files, setFiles] = useState<File[]>([])
        const [view, setView] = useState('internal')
        const [isAddingMore, setIsAddingMore] = useState(false)
        const inputRef = useRef<HTMLInputElement>(null)

        const {
            isDragging,
            setIsDragging,
            handleDragEnter,
            handleDragLeave,
            containerRef,
        } = useDragAndDrop()

        useEffect(() => {
            onChange && onChange(files)
            setIsAddingMore(false)
        }, [files])

        /**
         * Expose the handleUpload function to the parent component
         */
        useImperativeHandle(ref, () => ({
            /**
             * Upload the file to the cloud storage
             */
            async uploadFiles() {
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
                try {
                    if (filesToUpload) {
                        filesToUpload.forEach(file => {
                            /**
                             * assign a unique name for the file, usually has a timestamp prefix
                             */
                            const key = `${Date.now()}__${file.name}`
                            keys.push(key)

                            /**
                             * Upload the file to the cloud storage
                             */
                            putObject({ client, bucket, key, file })
                        })

                        return keys
                    }
                } catch (err) {
                    if (err instanceof Error) {
                        // ✅ TypeScript knows err is Error
                        throw new Error(err.message)
                    } else {
                        throw new Error('Unexpected error')
                    }
                }
                return []
            },
        }))

        /**
         * Check if the user selected at least one upload adapter
         */
        if (uploadAdapters.length === 0) {
            throw new Error('Please select at least one upload adapter')
        }

        /**
         * Get the client
         */
        const client = getClient(s3Configs)

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
                        />
                    )}
                </AnimatePresence>
                <input
                    type="file"
                    className="absolute w-0 h-0"
                    ref={inputRef}
                    multiple
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
                    // handleUpload={handleUpload}
                />
                <div className="p-2 h-full">
                    <div className="border-[#dfdfdf] border-dashed h-full w-full grid grid-rows-[1fr,auto] place-items-center border rounded-md transition-all">
                        <MethodsSelector
                            setView={setView}
                            inputRef={inputRef}
                            methods={methods}
                        />
                        <p className="text-xs text-[#9d9d9d] mb-4">
                            Powered by uNotes
                        </p>
                    </div>
                </div>
            </div>
        )
    })
