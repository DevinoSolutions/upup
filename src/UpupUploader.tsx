import React, { FC, useEffect, useRef, useState } from 'react'
import { OneDriveConfigs } from './types/OneDriveConfigs'
import { InternalUploader } from './components/InternalUploader'
import { GoogleDriveUploader } from './components/GoogleDriveUploader'
import OneDriveUploader from './components/OneDriveUploader'
import { CloudStorageConfigs } from './types/CloudStorageConfigs'
import { BaseConfigs } from './types/BaseConfigs'
import { GoogleConfigs } from './types/GoogleConfigs'
// import { getClient } from './lib/getClient'
import { UPLOAD_ADAPTER, UploadAdapter } from './types/UploadAdapter'
// import FileItem from './components/FileUploader/FileItem'
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
import { motion, AnimatePresence } from 'framer-motion'

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
    const [view, setView] = useState('internal')
    const inputRef = useRef(null)

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
        <div className="w-full max-w-[min(98svh,46rem)] bg-[#f4f4f4] h-[min(98svh,35rem)] rounded-md border grid grid-rows-[auto,1fr] relative overflow-hidden">
            <input type="file" className="absolute w-0 h-0" ref={inputRef} />

            <AnimatePresence>
                {view !== 'internal' && (
                    <motion.div
                        initial={{ y: '-100%' }}
                        animate={{ y: '0%' }}
                        exit={{ y: '-100%' }}
                        className="absolute h-full w-full grid grid-rows-[auto,1fr] z-10"
                    >
                        <div className="h-12 bg-[#fafafa] border-b flex justify-between items-center p-2 text-sm text-[#1b5dab] font-medium">
                            <button
                                className="hover:bg-[#e9ecef] active:bg-[#dfe6f1] rounded-md p-2 px-4 transition-all duration-300"
                                onClick={() => setView('internal')}
                            >
                                Cancel
                            </button>
                            <p className="text-[#333]">
                                Import from{' '}
                                {methods.find(x => x.id === view)!.name}
                            </p>
                            <button className="hover:bg-[#e9ecef] active:bg-[#dfe6f1] rounded-md p-2 px-4 transition-all duration-300 opacity-0">
                                Cancel
                            </button>
                        </div>

                        <div className="bg-[#f5f5f5]"></div>
                    </motion.div>
                )}
            </AnimatePresence>

            {files.length > 0 ? (
                <div className="h-12 bg-[#fafafa] border-b flex justify-between items-center p-2 text-sm text-[#1b5dab] font-medium">
                    <button className="hover:bg-[#e9ecef] active:bg-[#dfe6f1] rounded-md p-2 px-4 transition-all duration-300">
                        Cancel
                    </button>
                    <p className="text-[#333]">
                        {files.length} file{files.length > 1 ? 's' : ''}{' '}
                        selected
                    </p>
                    <button className="hover:bg-[#e9ecef] active:bg-[#dfe6f1] rounded-md p-2 px-4 transition-all duration-300">
                        Add more
                    </button>
                </div>
            ) : (
                <div></div>
            )}
            <div className="p-2">
                <div className="border-[#dfdfdf] border-dotted h-full w-full grid grid-rows-[1fr,auto] place-items-center border rounded-md">
                    <div className="w-full h-full flex flex-col items-center justify-center gap-6 ">
                        <h1 className="md:text-2xl text-center">
                            Drop files here,{' '}
                            <button
                                className="text-[#3782da] hover:underline"
                                // @ts-ignore
                                onClick={() => inputRef.current.click()}
                            >
                                browse files
                            </button>{' '}
                            or import from:
                        </h1>
                        <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 grid-rows-2">
                            {methods.map(method => (
                                <button
                                    key={method.id}
                                    className="flex flex-col items-center justify-center gap-1 text-sm hover:bg-[#e9ecef] active:bg-[#dfe6f1] rounded-md p-2 px-4 transition-all duration-300 mb-4 disabled:opacity-30 disabled:pointer-events-none group relative"
                                    disabled={
                                        !/internal|drive|onedrive/.test(
                                            method.id,
                                        )
                                    }
                                    onClick={() =>
                                        method.id === 'internal'
                                            ? // @ts-ignore
                                              inputRef.current.click()
                                            : setView(method.id)
                                    }
                                >
                                    <span className="bg-white p-[6px] rounded-lg text-2xl shadow ">
                                        {method.icon}
                                    </span>
                                    <span className="text-[#525252]">
                                        {method.name}
                                    </span>
                                    <span className="group-disabled:block hidden absolute -bottom-2 opacity-50">
                                        (soon)
                                    </span>
                                </button>
                            ))}
                        </div>
                    </div>
                    <p className="text-xs text-[#9d9d9d] mb-4">
                        Powered by UpUp
                    </p>
                </div>
            </div>
        </div>
    )
}

// TODO: Clean up and document code
