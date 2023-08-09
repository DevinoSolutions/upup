import React, { DragEvent, FC, useEffect, useState } from 'react'
import FileUploader from './FileUploader/FileUploader'
import { putObject } from '../lib/putObject'
import { compressFile } from '../lib/compressFile'
import { CloudStorageConfigs } from '../types/CloudStorageConfigs'
import { BaseConfigs } from '../types/BaseConfigs'
import styled from 'styled-components'
const UploadFilesContainer = styled.div`
    max-width: 100%;
    overflow: hidden;
    display: flex;
    width: 100%;
`

export interface Props {
    client: any
    cloudStorageConfigs: CloudStorageConfigs
    baseConfigs: BaseConfigs
}

/**
 *
 * @param client cloud provider client, ex: S3
 * @param bucket bucket name
 * @param setKey return the final name of the file, usually it has timestamp prefix
 * @param canUpload to control when to upload the file , it has default false value
 * @param toBeCompressed whether the user want to compress the file before uploading it or not. Default value is false
 * @param multiple whether the user want to upload multiple files or not. Default value is false
 * @param onChange callback function to return the file to the parent component
 * */
export const InternalUploader: FC<Props> = ({
    client,
    baseConfigs: {
        setKeys,
        canUpload,
        toBeCompressed = false,
        multiple = false,
        onChange,
    },
    cloudStorageConfigs: { bucket },
}: Props) => {
    /**
     * Handle the drag enter event
     */
    const [dragging, setDragging] = useState<boolean>(false)
    const handleDragEnter = (e: DragEvent<HTMLDivElement>) => {
        e.preventDefault()
        e.stopPropagation()
        setDragging(() => true)
    }

    /**
     * Files array
     */
    const [files, setFiles] = useState<File[]>([])

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
                })
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
        if (canUpload) {
            handleUpload()
        }
    }, [canUpload])

    useEffect(() => {
        onChange && onChange(files)
    }, [files])

    return (
        <UploadFilesContainer onDragEnter={handleDragEnter}>
            <FileUploader
                dragging={dragging}
                setDragging={setDragging}
                files={files}
                setFiles={setFiles}
                multiple={multiple}
            />
        </UploadFilesContainer>
    )
}
