import React, { FC, useEffect, useState } from 'react'
import { OneDriveConfigs } from './types/OneDriveConfigs'
import { InternalUploader } from './components/InternalUploader'
import { GoogleDriveUploader } from './components/GoogleDriveUploader'
import OneDriveUploader from './components/OneDriveUploader'
import { CloudStorageConfigs } from './types/CloudStorageConfigs'
import { BaseConfigs } from './types/BaseConfigs'
import { GoogleConfigs } from './types/GoogleConfigs'
import { getClient } from './lib/getClient'
import { UPLOAD_ADAPTER, UploadAdapter } from './types/UploadAdapter'
import styled from 'styled-components'
import FileItem from './components/FileUploader/FileItem'
const Container = styled.div`
    display: grid;
    grid-template-columns: repeat(
        2,
        fr
    ); /* Fix the grid-template-columns syntax */
    gap: 2px; /* Shorter syntax for grid-gap */
    width: 100%;
    max-width: 100%;
    overflow: hidden;
    padding: 8px;
    border-radius: 20px;
    background-color: transparent;
`
const SelectedComponent = styled.div`
    grid-column: span 1; /* Make the element span 2 columns */
`

const SelectedComponentLarge = styled.div`
    grid-column: span 2; /* Make the element span 2 columns */
`

const EmptyMessage = styled.h1`
    text-align: center;
    color: #9ca3af;
    font-size: 1rem;
`

const ScrollerContainer = styled.div`
    width: 100%;
    max-height: 10rem;
    padding: 8px 4px;
    display: flex;
    flex-wrap: wrap;
    justify-content: center;
    gap: 8px;
    background-color: #f0f4f8;
    border-radius: 20px;
    opacity: 0.6;
    overflow-y: auto;
    border: 1px solid black;
`

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
 * @param onChange return the files to the parent component
 * @constructor
 */
export const UpupUploader: FC<UpupUploaderProps> = ({
    cloudStorageConfigs,
    baseConfigs: { toBeCompressed = false, onChange, ...baseConfigs },
    uploadAdapters,
    googleConfigs,
    oneDriveConfigs,
}: UpupUploaderProps) => {
    const [files, setFiles] = useState<File[]>([])

    useEffect(() => {
        onChange && onChange(files)
    }, [files])

    /**
     * Check if the user selected at least one upload adapter
     */
    if (uploadAdapters.length === 0) {
        throw new Error('Please select at least one upload adapter')
    }

    /**
     * Get the client
     */
    const client = getClient(cloudStorageConfigs.s3Configs)

    /**
     *  Define the components to be rendered based on the user selection of
     *  the upload adapters (internal, google drive, one drive)
     */
    const components = {
        [UploadAdapter.INTERNAL]: (
            <InternalUploader
                client={client}
                cloudStorageConfigs={cloudStorageConfigs}
                baseConfigs={baseConfigs}
                setFiles={setFiles}
                files={files}
            />
        ),
        [UploadAdapter.GOOGLE_DRIVE]: (
            <GoogleDriveUploader
                client={client}
                cloudStorageConfigs={cloudStorageConfigs}
                googleConfigs={googleConfigs as GoogleConfigs}
                baseConfigs={baseConfigs}
                setFiles={setFiles}
            />
        ),
        [UploadAdapter.ONE_DRIVE]: (
            <OneDriveUploader
                client={client}
                cloudStorageConfigs={cloudStorageConfigs}
                baseConfigs={baseConfigs}
                oneDriveConfigs={oneDriveConfigs}
                setFiles={setFiles}
            />
        ),
    }

    /**
     * Select the components to be rendered based on the user selection of
     * the upload adapters (internal, google drive, one drive)
     * using key as index to avoid the warning: Each child in a list should have a unique "key" prop.
     */
    const selectedComponent = uploadAdapters.map(uploadAdapter => {
        if (uploadAdapter === UploadAdapter.INTERNAL) {
            return (
                <SelectedComponentLarge key={uploadAdapter}>
                    {components[uploadAdapter]}
                </SelectedComponentLarge>
            )
        } else {
            return (
                <SelectedComponent key={uploadAdapter}>
                    {components[uploadAdapter]}
                </SelectedComponent>
            )
        }
    })

    /**
     *  Return the selected components
     */
    return (
        <>
            <Container>{selectedComponent}</Container>
            <ScrollerContainer>
                {files && files.length > 0 ? (
                    files.map((f, key) => (
                        <FileItem setFiles={setFiles} key={key} file={f} />
                    ))
                ) : (
                    <EmptyMessage>No files</EmptyMessage>
                )}
            </ScrollerContainer>
        </>
    )
}
