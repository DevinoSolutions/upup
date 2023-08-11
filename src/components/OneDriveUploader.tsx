import React, { Dispatch, FC, SetStateAction, useEffect, useState } from 'react'
import useLoadOdAPI from '../hooks/useLoadOdAPI'
import { BaseConfigs } from '../types/BaseConfigs'
import { OneDriveConfigs, OneDriveResponse } from '../types/OneDriveConfigs'
import { compressFile } from '../lib/compressFile'
import { putObject } from '../lib/putObject'
import { CloudStorageConfigs } from '../types/CloudStorageConfigs'
import styled from 'styled-components'

const OneDriveButton = styled.button`
    display: flex;
    align-items: center;
    justify-content: center;
    background-color: #ffffff;
    color: #4a5568;
    padding: 0.5rem 1rem;
    border-radius: 0.375rem;
    box-shadow: 0 2px 3px rgba(0, 0, 0, 0.1);
    transition:
        background-color 0.3s ease-in-out,
        color 0.3s ease-in-out;

    &:hover {
        background-color: #f0f4f8;
        color: #2d3748;
    }

    img {
        width: 1.25rem;
        height: 1.25rem;
        margin-right: 0.5rem;
        fill: currentColor;
    }
`
const OneDriveLogo = styled.img`
    width: 20px;
    height: 20px;
    margin-right: 8px;
`
interface Props {
    client: any
    cloudStorageConfigs: CloudStorageConfigs
    baseConfigs: BaseConfigs
    oneDriveConfigs: OneDriveConfigs
    setFiles: Dispatch<SetStateAction<File[]>>
}

/**
 * Upload files from One Drive to S3 bucket
 * @param client s3 client
 * @param bucket s3 bucket
 * @param setKey return the final name of the file, usually it has timestamp prefix
 * @param toBeCompressed whether the user want to compress the file before uploading it or not. Default value is false
 * @param oneDriveConfigs one drive configs
 * @param setFilesFromParent return the files to the parent component
 * @constructor
 */
const OneDriveUploader: FC<Props> = ({
    client,
    cloudStorageConfigs: { bucket },
    baseConfigs: { setKeys, toBeCompressed },
    oneDriveConfigs,
    setFiles: setFilesFromParent = () => {},
}: Props) => {
    const [files, setFiles] = useState<File[]>([])

    const { isLoaded } = useLoadOdAPI()

    /**
     * Upload the file to the cloud storage when the files array is updated
     */
    useEffect(() => {
        setFilesFromParent(oldFiles => [...oldFiles, ...files])
        let keys: string[] = []
        files.map(file => {
            const key = `${Date.now()}__${file.name}`
            keys.push(key)
            putObject({ client, bucket, key, file })
        })
        setKeys(keys)
    }, [files])

    /**
     * Save the files to the files array
     * @param oneDriveResponse
     */
    const processResponse = (oneDriveResponse: OneDriveResponse) => {
        /**
         * Create a new array to store the files
         */
        const filesArray: File[] = []

        /**
         * Loop through the files array and download the files
         */
        Promise.all(
            oneDriveResponse.value.map(async (file: any) => {
                /**
                 * Download the file from the one drive
                 */
                const response = await fetch(
                    file['@microsoft.graph.downloadUrl'],
                )
                /**
                 * Convert the file to blob
                 */
                const blob = await response.blob()
                /**
                 * Create a new file from the blob
                 */
                const newFile = new File([blob], file.name, {
                    type: file.file.mimeType,
                })
                /**
                 * Push the new file to the files array
                 */
                filesArray.push(newFile)
            }),
        ).then(() => {
            /**
             * Compress the files if the user want to compress the files
             */
            if (files.length == 0) return
            if (toBeCompressed)
                /**
                 * Compress the files and set the files array
                 */
                filesArray.map(async file => {
                    setFiles([
                        ...files,
                        await compressFile({
                            element: file,
                            element_name: file.name,
                        }),
                    ])
                })
            /**
             * Otherwise, just set the files array
             */ else setFiles(filesArray)
        })
    }

    /**
     * Open the one drive picker
     */
    const openPicker = () => {
        /**
         * One Drive options
         */
        const odOptions = {
            clientId: oneDriveConfigs ? oneDriveConfigs.onedrive_client_id : '',
            action: 'download',
            multiSelect: oneDriveConfigs ? oneDriveConfigs.multiSelect : false,
            openInNewWindow: true,
            advanced: {
                //     redirectUri: 'http://localhost:3000',
                filter: '.jpg,.png,.pdf,.docx,.xlsx,.pptx',
                queryParameters: 'select=id,name,size,file,folder',
                //     scopes: 'files.readwrite.all',
            },
            success: (response: OneDriveResponse) => {
                /**
                 *  Save the files to the files array
                 */
                processResponse(response)
            },
            cancel: () => {
                console.log('User cancelled')
            },
            error: (e: any) => {
                console.log(e)
            },
        }
        /**
         * Open the one drive picker with the options above
         * @see https://docs.microsoft.com/en-us/onedrive/developer/controls/file-pickers/js-v72/open-file-picker
         */
        ;(window as any).OneDrive.open(odOptions)
    }

    return (
        <div>
            {isLoaded && (
                // one drive button with logo and text
                <OneDriveButton onClick={openPicker}>
                    <OneDriveLogo
                        src="https://static2.sharepointonline.com/files/fabric/assets/brand-icons/product/svg/onedrive_32x1.svg"
                        alt="One Drive Logo"
                    />
                    One Drive
                </OneDriveButton>
            )}
        </div>
    )
}

export default OneDriveUploader
