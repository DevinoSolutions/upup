import React, { FC, useEffect, useRef, useState } from 'react'
import { OneDriveConfigs } from './types/OneDriveConfigs'
import { InternalUploader } from './components/InternalUploader'
import { GoogleDriveUploader } from './components/GoogleDriveUploader'
import OneDriveUploader from './components/OneDriveUploader'
import { CloudStorageConfigs } from './types/CloudStorageConfigs'
import { BaseConfigs } from './types/BaseConfigs'
import { GoogleConfigs } from './types/GoogleConfigs'
import { getClient } from './lib/getClient'
import { UPLOAD_ADAPTER, UploadAdapter } from './types/UploadAdapter'
import FileItem from './components/FileUploader/FileItem'
import { compressFile } from './lib/compressFile'
import { putObject } from './lib/putObject'
import {
    AudioIcon,
    BoxIcon,
    CameraIcon,
    DropBoxIcon,
    FacebookIcon,
    GoogleDriveIcon,
    InstagramIcon,
    LinkIcon,
    MyDeviceIcon,
    OneDriveIcon,
    ScreenCastIcon,
    UnsplashIcon,
} from './components/Icons'
import View from './components/UpupUploader/View'
import MethodsSelector from './components/UpupUploader/MethodSelector'
import Preview from './components/UpupUploader/Preview'

const methods = [
    { id: 'internal', name: 'My Device', icon: <MyDeviceIcon /> },
    { id: 'box', name: 'Box', icon: <BoxIcon /> },
    { id: 'dropbox', name: 'Dropbox', icon: <DropBoxIcon /> },
    { id: 'facebook', name: 'Facebook', icon: <FacebookIcon /> },
    { id: 'GOOGLE_DRIVE', name: 'Google Drive', icon: <GoogleDriveIcon /> },
    { id: 'instagram', name: 'Instagram', icon: <InstagramIcon /> },
    { id: 'ONE_DRIVE', name: 'OneDrive', icon: <OneDriveIcon /> },
    { id: 'unsplash', name: 'Unsplash', icon: <UnsplashIcon /> },
    { id: 'link', name: 'Link', icon: <LinkIcon /> },
    { id: 'camera', name: 'Camera', icon: <CameraIcon /> },
    { id: 'audio', name: 'Audio', icon: <AudioIcon /> },
    { id: 'screencast', name: 'ScreenCast', icon: <ScreenCastIcon /> },
]

export interface UpupUploaderProps {
    cloudStorageConfigs: CloudStorageConfigs
    baseConfigs: BaseConfigs
    uploadAdapters: UPLOAD_ADAPTER[]
    googleConfigs?: GoogleConfigs | undefined
    oneDriveConfigs?: OneDriveConfigs | undefined
}

/**
 *
 * @param cloudStorageConfigs cloud provider configurations
 * @param baseConfigs base configurations
 * @param toBeCompressed whether the user want to compress the file before uploading it or not. Default value is false
 * @param uploadAdapters whether the user want to upload files from internal storage or Google drive or both
 * @param googleConfigs google configurations
 * @param oneDriveConfigs one drive configurations
 * @constructor
 */

export const UpupUploader: FC<UpupUploaderProps> = ({
    cloudStorageConfigs,
    baseConfigs,
    uploadAdapters,
    googleConfigs,
    oneDriveConfigs,
}: UpupUploaderProps) => {
    const { bucket, s3Configs } = cloudStorageConfigs
    const {
        setKeys,
        canUpload,
        toBeCompressed = false,
        multiple = false,
        onChange,
    } = baseConfigs

    const [files, setFiles] = useState<File[]>([])
    const [view, setView] = useState('internal')
    const [isAddingMore, setIsAddingMore] = useState(false)
    const inputRef = useRef(null)

    useEffect(() => {
        onChange && onChange(files)
        setIsAddingMore(false)
    }, [files])

    /**
     * Upload the file to the cloud storage
     */
    const handleUpload = async () => {
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

            // set the file name
            setKeys(keys)
        }
    }

    /**
     * Upload the file to the cloud storage when canUpload set is true
     */
    useEffect(() => {
        if (canUpload) handleUpload()
    }, [canUpload])

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
        [UploadAdapter.INTERNAL]: (
            <InternalUploader
                setFiles={setFiles}
                files={files}
                multiple={multiple}
            />
        ),
        [UploadAdapter.GOOGLE_DRIVE]: (
            <GoogleDriveUploader
                googleConfigs={googleConfigs as GoogleConfigs}
                baseConfigs={baseConfigs}
                setFiles={setFiles}
            />
        ),
        [UploadAdapter.ONE_DRIVE]: (
            <OneDriveUploader
                oneDriveConfigs={oneDriveConfigs as OneDriveConfigs}
                setFiles={setFiles}
            />
        ),
    }

    return (
        <div className="w-full max-w-[min(98svh,46rem)] bg-[#f4f4f4] h-[min(98svh,35rem)] rounded-md border flex flex-col relative overflow-hidden select-none">
            <input
                type="file"
                className="absolute w-0 h-0"
                ref={inputRef}
                multiple
                onChange={e =>
                    setFiles(files =>
                        isAddingMore
                            ? // @ts-ignore // FIXME
                              [...files, ...e.target.files]
                            : // @ts-ignore // FIXME
                              [...e.target.files],
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
            />
            <div className="p-2 h-full">
                <div className="border-[#dfdfdf] border-dotted h-full w-full grid grid-rows-[1fr,auto] place-items-center border rounded-md transition-all">
                    <MethodsSelector
                        setView={setView}
                        inputRef={inputRef}
                        methods={methods}
                    />
                    <p className="text-xs text-[#9d9d9d] mb-4">
                        Powered by UpUp
                    </p>
                </div>
            </div>
        </div>
    )
}
