import { Meta } from '@storybook/react'
import {
    UPLOAD_ADAPTER,
    UploadAdapter,
    UploadFilesRef,
    UpupUploader,
} from '../src'
import useUpup from '../src/hooks/useUpup'
import { useRef } from 'react'

const meta: Meta<typeof UpupUploader> = {
    title: 'Uploader',
    component: UpupUploader,
}

export default meta

const Uploader = args => {
    const { baseConfigs, cloudStorageConfigs, googleConfigs, oneDriveConfigs } =
        useUpup({
            accept: 'pdf,docx,doc,png,jpg',
            multiple: true,
            limit: 5,
            onFileClick: file => void 0,
            onFilesChange: files => void 0,
            ...args,
        })
    const uploadAdapters: UPLOAD_ADAPTER[] = [
        UploadAdapter.INTERNAL,
        UploadAdapter.GOOGLE_DRIVE,
        UploadAdapter.ONE_DRIVE,
        UploadAdapter.LINK,
        UploadAdapter.CAMERA,
    ]

    const upupRef = useRef<UploadFilesRef>()

    const handleUpload = async () => {
        await upupRef.current
            ?.uploadFiles()
            .then(data => console.log('data', data))
    }
    return (
        <>
            <UpupUploader
                {...args}
                baseConfigs={baseConfigs}
                uploadAdapters={uploadAdapters}
                cloudStorageConfigs={cloudStorageConfigs}
                googleConfigs={googleConfigs}
                oneDriveConfigs={oneDriveConfigs}
                ref={upupRef}
            />
            <button onClick={handleUpload}>Upload</button>
        </>
    )
}

export const Default = () => Uploader({})
export const Mini = () => Uploader({ mini: true })
