import type { Meta, StoryObj } from '@storybook/react'
import { useRef, useState } from 'react'
import { UpupUploader } from '../src'
import { UploadFilesRef } from '../src/UpupUploader'

const meta = {
    title: 'Cloud Storage/Local to Azure Upload',
    component: UpupUploader,
    parameters: {
        layout: 'centered',
        docs: {
            description: {
                component: 'Upload local files directly to Azure Blob storage.',
            },
        },
    },
    tags: ['autodocs'],
} satisfies Meta<typeof UpupUploader>

export default meta
type Story = StoryObj<typeof UpupUploader>

const LocalUploader = () => {
    const [files, setFiles] = useState<File[]>([])
    const upupRef = useRef<UploadFilesRef>()

    const handleUpload = async () => {
        try {
            const data = await upupRef.current?.uploadFiles()
            console.log(`Upload ${data ? 'successful' : 'returned null'}`)
            if (data) {
                console.log('Uploaded file keys:', data)
                // Azure specific: data will include SAS URLs for the uploaded blobs
                console.log(
                    'Azure SAS URLs:',
                    data.map(result => result.sasUrl),
                )
            }
        } catch (error) {
            console.error('Error uploading files:', error)
        }
    }

    return (
        <div className="flex flex-col gap-4">
            <UpupUploader
                ref={upupRef}
                storageConfig={{
                    provider: 'azure',
                    region: 'northcentralus', // Azure region
                    bucket: 'your-container-name', // Azure container name
                    tokenEndpoint:
                        'http://localhost:3001/api/storage/azure/upload-url',
                    expiresIn: 3600, // 1 hour token expiration
                }}
                baseConfigs={{
                    multiple: true,
                    accept: '*',
                    maxFileSize: { size: 100, unit: 'MB' },
                    onChange: files => {
                        setFiles(files)
                        console.log('Files selected:', files)
                    },
                }}
                uploadAdapters={['INTERNAL']}
            />
            <button
                className="rounded bg-blue-500 px-4 py-2 text-white hover:bg-blue-600"
                onClick={handleUpload}
            >
                Upload to Azure
            </button>
        </div>
    )
}

export const Default: Story = {
    render: () => <LocalUploader />,
}

// Add an example with specific file type restrictions
export const RestrictedFileTypes: Story = {
    render: () => {
        const Component = () => {
            const [files, setFiles] = useState<File[]>([])
            const upupRef = useRef<UploadFilesRef>()

            return (
                <div className="flex flex-col gap-4">
                    <UpupUploader
                        ref={upupRef}
                        storageConfig={{
                            provider: 'azure',
                            region: 'northcentralus',
                            bucket: 'your-container-name',
                            tokenEndpoint:
                                'http://localhost:3001/api/storage/azure/upload-url',
                        }}
                        baseConfigs={{
                            multiple: true,
                            // Only allow images and PDFs
                            accept: 'image/*,application/pdf',
                            maxFileSize: { size: 10, unit: 'MB' },
                            onChange: files => {
                                setFiles(files)
                                console.log('Files selected:', files)
                            },
                        }}
                        uploadAdapters={['INTERNAL']}
                    />
                    <button
                        className="rounded bg-blue-500 px-4 py-2 text-white hover:bg-blue-600"
                        onClick={() => upupRef.current?.uploadFiles()}
                    >
                        Upload Images/PDFs to Azure
                    </button>
                </div>
            )
        }
        return <Component />
    },
}

// Add an example with metadata
export const WithMetadata: Story = {
    render: () => {
        const Component = () => {
            const [files, setFiles] = useState<File[]>([])
            const upupRef = useRef<UploadFilesRef>()

            const handleUpload = async () => {
                try {
                    const data = await upupRef.current?.uploadFiles({
                        metadata: {
                            uploadedBy: 'storybook-demo',
                            department: 'engineering',
                            environment: 'development',
                        },
                    })
                    console.log('Upload result:', data)
                } catch (error) {
                    console.error('Error uploading files:', error)
                }
            }

            return (
                <div className="flex flex-col gap-4">
                    <UpupUploader
                        ref={upupRef}
                        storageConfig={{
                            provider: 'azure',
                            region: 'northcentralus',
                            bucket: 'your-container-name',
                            tokenEndpoint:
                                'http://localhost:3001/api/storage/azure/upload-url',
                        }}
                        baseConfigs={{
                            multiple: true,
                            accept: '*',
                            maxFileSize: { size: 50, unit: 'MB' },
                            onChange: files => {
                                setFiles(files)
                                console.log('Files selected:', files)
                            },
                        }}
                        uploadAdapters={['INTERNAL']}
                    />
                    <button
                        className="rounded bg-blue-500 px-4 py-2 text-white hover:bg-blue-600"
                        onClick={handleUpload}
                    >
                        Upload with Metadata
                    </button>
                </div>
            )
        }
        return <Component />
    },
}
