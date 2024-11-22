import type { Meta, StoryObj } from '@storybook/react'
import { useRef } from 'react'
import { UploadFilesRef, UpupUploader } from '../src'

const meta = {
    title: 'Cloud Storage/Local to DigitalOcean Upload',
    component: UpupUploader,
    parameters: {
        layout: 'centered',
        docs: {
            description: {
                component:
                    'Upload local files directly to DigitalOcean Spaces.',
            },
        },
    },
} satisfies Meta<typeof UpupUploader>

export default meta
type Story = StoryObj<typeof UpupUploader>

const LocalUploader = () => {
    const upupRef = useRef<UploadFilesRef>(null)

    const handleUpload = async () => {
        try {
            const data = await upupRef.current?.uploadFiles()
            console.log(`Upload ${data ? 'successful' : 'returned null'}`)
            if (data) {
                console.log('Uploaded file keys:', data)
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
                    provider: 'digitalocean',
                    tokenEndpoint:
                        'http://localhost:3001/api/storage/digitalocean/upload-url',
                }}
                baseConfigs={{
                    multiple: true,
                    accept: '*',
                    maxFileSize: { size: 100, unit: 'MB' },
                    onChange: (files: File[]) => {
                        console.log('Files selected:', files)
                    },
                }}
                uploadAdapters={['INTERNAL']}
            />
            <button
                className="rounded bg-blue-500 px-4 py-2 text-white hover:bg-blue-600"
                onClick={handleUpload}
            >
                Upload to DigitalOcean
            </button>
        </div>
    )
}

export const Default: Story = {
    render: () => <LocalUploader />,
}
