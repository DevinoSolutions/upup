import { CircularProgress } from '@mui/material'
import { Meta } from '@storybook/react'
import { useRef } from 'react'
import {
    UPLOAD_ADAPTER,
    UploadAdapter,
    UploadFilesRef,
    UpupUploader,
} from '../src'
import { useUpup } from '../src/hooks'
// import react only on this file to avoid error
// we get an error because we're not exporting UpupUploader as default

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
            onFileClick: file => void 0,
            onFilesChange: files => {
                console.log('files', files)
                return files
            },
            theme: {
                container:
                    'container relative flex h-[min(98svh,35rem)] w-full max-w-[min(98svh,46rem)] select-none flex-col overflow-hidden rounded-md border bg-[#f4f4f4] dark:bg-[#1f1f1f]',
            },
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
        try {
            const data = await upupRef.current?.uploadFiles()
            console.log(`Upload ${data ? 'successful' : 'returned null.'} `)
        } catch (error) {
            console.error('Error uploading files:', error)
        }
    }

    const loader = <CircularProgress size={100} />

    return (
        <>
            <UpupUploader
                {...args}
                baseConfigs={baseConfigs}
                uploadAdapters={uploadAdapters}
                cloudStorageConfigs={cloudStorageConfigs}
                googleConfigs={googleConfigs}
                oneDriveConfigs={oneDriveConfigs}
                loader={loader}
                ref={upupRef}
            />
            <button onClick={handleUpload}>Upload</button>
        </>
    )
}

export const Default = () => Uploader({})
export const Mini = () => Uploader({ mini: true })
