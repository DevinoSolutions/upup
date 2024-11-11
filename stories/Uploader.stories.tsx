import { Meta } from '@storybook/react'
import { useRef, useState } from 'react'
import { UploadFilesRef, UpupUploader } from '../src'
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
    const { baseConfigs, cloudStorageConfigs } = useUpup({
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

    return (
        <>
            <UpupUploader
                {...args}
                baseConfigs={baseConfigs}
                cloudStorageConfigs={cloudStorageConfigs}
                adaptersConfigs={{
                    oneDrive: { clientId: process.env.ONEDRIVE_CLIENT_ID },
                    googleDrive: {
                        apiKey: process.env.GOOGLE_API_KEY,
                        clientId: process.env.GOOGLE_CLIENT_ID,
                    },
                }}
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
