import { CircularProgress } from '@mui/material'
import { Meta } from '@storybook/react'
import React, { useRef, useState } from 'react'
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
    const [files, setFiles] = useState<File[]>([])
    const { baseConfigs } = useUpup({
        setFiles: setFiles,
        accept: '*',
        multiple: true,
        limit: 5,
        onFileClick: file => void 0,
        onFilesChange: files => {
            console.log('files', files)
            return files
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
    const handleDynamicUpload = async () => {
        try {
            const testFiles: any[] = []
            testFiles.push(files[0])
            const data = await upupRef.current?.dynamicUploadFiles(testFiles)
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
                loader={loader}
                ref={upupRef}
            />
            <button className="border-2 border-red-100" onClick={handleUpload}>
                Upload
            </button>
            <button
                className="ml-3 border-2 border-red-100"
                onClick={handleDynamicUpload}
            >
                Dynamic Upload
            </button>
        </>
    )
}

export const Default = () => Uploader({})
export const Mini = () => Uploader({ mini: true })
