# todo

-   error handling logic - retry logic - progress tracking - implement the credentials refresh mechanism

-   properly generate presigned URLs using each official SDK
-   error handling cases specific to Azure
-   credential managers to match the new SDK requirements

## CURRENT

-   Show how to handle chunked uploads for large files
-   more specific error handling for each SDK
-   Add support for resumable uploads using signed URLs

-   The current story Uploader.stories.tsx shows only AWS upload. Let's create other stories to represent upload to other cloud providers

-   Let's provide the backend implementation for each of these stories

## IMPROVEMENTS

-   documentation for the component in the IDE
-   tests
-   proper error and info alerts on ongoing processes

```md
import { CircularProgress } from '@mui/material'
import { Meta } from '@storybook/react'
import { useRef, useState } from 'react'
import {
UploadAdapter,
UpupUploader,
type UPLOAD_ADAPTER,
type UploadFilesRef,
} from '../src'
import { useUpup } from '../src/hooks'
import { StorageConfig } from '../src/types/StorageSDK'
// import react only on this file to avoid error
// we get an error because we're not exporting UpupUploader as default

const meta: Meta<typeof UpupUploader> = {
title: 'Uploader',
component: UpupUploader,
}

export default meta

const Uploader = args => {
const [files, setFiles] = useState<File[]>([])
const { baseConfigs, googleConfigs, oneDriveConfigs } = useUpup({
setFiles: setFiles,
accept: '\*',
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

    const storageConfig: StorageConfig = {
        provider: 'aws',
        region: 'us-east-1',
        bucket: 'your-bucket',
        tokenEndpoint: 'http://localhost:3001/api/storage/aws/upload-url',
        expiresIn: 3600,
    }

    return (
        <>
            <UpupUploader
                {...args}
                storageConfig={storageConfig}
                baseConfigs={baseConfigs}
                uploadAdapters={uploadAdapters}
                googleConfigs={googleConfigs}
                oneDriveConfigs={oneDriveConfigs}
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
```
