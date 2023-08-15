import React, { FC, useEffect, useState } from 'react'
import { OneDriveConfigs } from './types/OneDriveConfigs'
import { InternalUploader } from './components/InternalUploader'
import { GoogleDriveUploader } from './components/GoogleDriveUploader'
import OneDriveUploader from './components/OneDriveUploader'
import { CloudStorageConfigs } from './types/CloudStorageConfigs'
import { BaseConfigs } from './types/BaseConfigs'
import { GoogleConfigs } from './types/GoogleConfigs'
// import { getClient } from './lib/getClient'
import { UPLOAD_ADAPTER, UploadAdapter } from './types/UploadAdapter'
import FileItem from './components/FileUploader/FileItem'
import { compressFile } from './lib/compressFile'
// import { putObject } from './lib/putObject'
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

const methods = [
    { id: 'internal', name: 'My Device', icon: <MyDeviceIcon /> },
    { id: 'box', name: 'Box', icon: <BoxIcon /> },
    { id: 'dropbox', name: 'Dropbox', icon: <DropBoxIcon /> },
    { id: 'facebook', name: 'Facebook', icon: <FacebookIcon /> },
    { id: 'drive', name: 'Google Drive', icon: <GoogleDriveIcon /> },
    { id: 'instagram', name: 'Instagram', icon: <InstagramIcon /> },
    { id: 'onedrive', name: 'OneDrive', icon: <OneDriveIcon /> },
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
    // cloudStorageConfigs, // TODO: uncomment this line after you fix env variables
    baseConfigs,
    uploadAdapters,
    googleConfigs,
    oneDriveConfigs,
}: UpupUploaderProps) => {
    // const { bucket, s3Configs } = cloudStorageConfigs // TODO: uncomment this line after you fix env variables
    const {
        setKeys,
        canUpload,
        toBeCompressed = false,
        multiple = false,
        onChange,
    } = baseConfigs
    const [files, setFiles] = useState<File[]>([])
    useEffect(() => {
        onChange && onChange(files)
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
                // putObject({ client, bucket, key, file }) // TODO: uncomment this line after you fix env variables
            })

            // set the file name
            setKeys(keys)
        }
    }

    /**
     * Upload the file to the cloud storage when canUpload set is true
     */
    useEffect(() => {
        if (canUpload) {
            handleUpload()
        }
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
    // const client = getClient(s3Configs) // TODO: uncomment this line after you fix env variables

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

    /**
     * Select the components to be rendered based on the user selection of
     * the upload adapters (internal, google drive, one drive)
     * using key as index to avoid the warning: Each child in a list should have a unique "key" prop.
     */
    // const selectedComponent = uploadAdapters.map(uploadAdapter => {
    //     if (uploadAdapter === UploadAdapter.INTERNAL) {
    //         return (
    //             <SelectedComponentLarge key={uploadAdapter}>
    //                 {components[uploadAdapter]}
    //             </SelectedComponentLarge>
    //         )
    //     } else {
    //         return (
    //             <SelectedComponent key={uploadAdapter}>
    //                 {components[uploadAdapter]}
    //             </SelectedComponent>
    //         )
    //     }
    // })

    /**
     *  Return the selected components
     */
    return (
        <div className="w-full max-w-5xl bg-[#f4f4f4] h-[min(98svh,32rem)] rounded-md p-2 border relative">
            <div className="border-dotted w-full h-full border rounded-md flex flex-col items-center justify-center gap-6 border-[#dfdfdf]">
                <h1 className="text-2xl">
                    Drop files here,{' '}
                    <span className="text-[#3782da]">browse files</span> or
                    import from:
                </h1>
                <div className="grid grid-cols-6 grid-rows-2">
                    {methods.map(method => (
                        <button
                            key={method.id}
                            className="flex flex-col items-center justify-center gap-1 text-sm hover:bg-[#e9ecef] active:bg-[#dfe6f1] rounded-md p-2 px-4 transition-all duration-300 mb-4"
                        >
                            <span className="bg-white p-[6px] rounded-lg text-2xl shadow ">
                                {method.icon}
                            </span>
                            <span className="text-[#525252]">
                                {method.name}
                            </span>
                        </button>
                    ))}
                </div>
            </div>
            <p className="absolute bottom-4 left-1/2 -translate-x-1/2 text-sm text-[#9d9d9d]">
                Powered by UpUp
            </p>
        </div>
    )
}
