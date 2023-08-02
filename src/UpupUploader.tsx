import React, { FC } from 'react'
import { IOneDriveConfigs } from './types/IOneDriveConfigs'
import { UploadFiles } from './components/UploadFiles'
import { GoogleDrive } from './components/GoogleDrive'
import OneDrive from './components/OneDrive'
import { ICloudStorageConfigs } from './types/ICloudStorageConfigs'
import { IBaseConfigs } from './types/IBaseConfigs'
import { IGoogleConfigs } from './types/IGoogleConfigs'
import { getClient } from './lib/getClient'
import { UploadAdapter } from './enums/UploadAdapter'

export interface UpupUploaderProps {
    cloudStorageConfigs: ICloudStorageConfigs
    baseConfigs: IBaseConfigs
    uploadAdapters: UploadAdapter[]
    googleConfigs?: IGoogleConfigs | undefined
    oneDriveConfigs?: IOneDriveConfigs | undefined
}

/**
 *
 * @param cloudStorageConfigs cloud provider configurations
 * @param baseConfigs base configurations
 * @param toBeCompressed whether the user want to compress the file before uploading it or not. Default value is false
 * @param uploadProviders whether the user want to upload files from internal storage or Google drive or both
 * @param googleConfigs google configurations
 * @param oneDriveConfigs one drive configurations
 * @constructor
 */
export const UpupUploader: FC<UpupUploaderProps> = ({
    cloudStorageConfigs,
    baseConfigs: { toBeCompressed = false, ...baseConfigs },
    uploadAdapters,
    googleConfigs,
    oneDriveConfigs,
}: UpupUploaderProps) => {
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
        [UploadAdapter.internal]: (
            <UploadFiles
                client={client}
                cloudStorageConfigs={cloudStorageConfigs}
                baseConfigs={baseConfigs}
            />
        ),
        [UploadAdapter.google_drive]: (
            <GoogleDrive
                client={client}
                cloudStorageConfigs={cloudStorageConfigs}
                googleConfigs={googleConfigs as IGoogleConfigs}
                baseConfigs={baseConfigs}
            />
        ),
        [UploadAdapter.one_drive]: (
            <OneDrive
                client={client}
                cloudStorageConfigs={cloudStorageConfigs}
                baseConfigs={baseConfigs}
                oneDriveConfigs={oneDriveConfigs}
            />
        ),
    }

    /**
     * Select the components to be rendered based on the user selection of
     * the upload adapters (internal, google drive, one drive)
     * using key as index to avoid the warning: Each child in a list should have a unique "key" prop.
     */
    const selectedComponent = uploadAdapters.map((uploadAdapter, index) => (
        <div key={index}>{components[uploadAdapter]}</div>
    ))

    /**
     *  Return the selected components
     */
    return <>{selectedComponent}</>
}
