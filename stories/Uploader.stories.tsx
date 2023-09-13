import { Meta } from '@storybook/react'
import { UPLOAD_ADAPTER, UploadAdapter, UpupUploader } from '../src'
import useUpup from '../src/hooks/useUpup'
import React from 'react'

const meta: Meta<typeof UpupUploader> = {
    title: 'Uploader',
    component: UpupUploader,
}

export default meta

const Uploader = args => {
    const { baseConfigs, cloudStorageConfigs, googleConfigs, oneDriveConfigs } =
        useUpup({
            accept: '*',
            multiple: true,
            limit: 5,
            onFileClick: file => console.log(file),
            onFilesChange: files => console.log(files),
            ...args,
        })
    const uploadAdapters: UPLOAD_ADAPTER[] = [
        UploadAdapter.INTERNAL,
        UploadAdapter.GOOGLE_DRIVE,
        UploadAdapter.ONE_DRIVE,
        UploadAdapter.LINK,
        UploadAdapter.CAMERA,
    ]

    return (
        <UpupUploader
            {...args}
            baseConfigs={baseConfigs}
            uploadAdapters={uploadAdapters}
            cloudStorageConfigs={cloudStorageConfigs}
            googleConfigs={googleConfigs}
            oneDriveConfigs={oneDriveConfigs}
        />
    )
}

export const Default = () => Uploader({})
export const Mini = () => Uploader({ mini: true })
