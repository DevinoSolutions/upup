import type { Meta, StoryObj } from '@storybook/react'
import { useRef, useState } from 'react'
import { UpupUploader } from '../src'
import { UploadFilesRef } from '../src/UpupUploader'

const meta = {
    title: 'Cloud Storage/Local to AWS Upload',
    component: UpupUploader,
    parameters: {
        layout: 'centered',
        docs: {
            description: {
                component: 'Upload local files directly to AWS S3 storage.',
            },
        },
    },
    tags: ['autodocs'],
} satisfies Meta<typeof UpupUploader>

export default meta
type Story = StoryObj<typeof UpupUploader>

const LocalUploader = () => {
    const [selectedFiles, setSelectedFiles] = useState<File[]>([])
    const upupRef = useRef<UploadFilesRef>(null)

    const handleUpload = async () => {
        try {
            const data = await upupRef.current?.uploadFiles()
            console.log(`Upload ${data ? 'successful' : 'returned null'}`)
            if (data) {
                console.log('Uploaded file keys:', data)
            }
        } catch (error) {
            console.error('Error uploading selected files:', error)
        }
    }

    return (
        <div className="flex flex-col gap-4">
            <UpupUploader
                ref={upupRef}
                storageConfig={{
                    provider: 'aws',
                    tokenEndpoint:
                        'http://localhost:3001/api/storage/aws/upload-url',
                }}
                baseConfigs={{
                    multiple: true,
                    accept: '*',
                    maxFileSize: { size: 100, unit: 'MB' },
                    onFilesSelected: files => {
                        setSelectedFiles(files)
                        console.log('Files selected:', files)
                    },
                }}
                uploadAdapters={['INTERNAL']}
            />
            <button
                className="rounded bg-blue-500 px-4 py-2 text-white hover:bg-blue-600"
                onClick={handleUpload}
            >
                Upload to AWS
            </button>
        </div>
    )
}

export const Default: Story = {
    render: () => <LocalUploader />,
}
