import type { Meta, StoryObj } from '@storybook/react'
import React, { useRef } from 'react'
import UpupUploader from '../src/frontend/UpupUploader'
import { UpupProvider, UpupUploaderRef } from '../src/shared/types'

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
} satisfies Meta<typeof UpupUploader>

export default meta
type Story = StoryObj<typeof UpupUploader>

const LocalUploader = () => {
    const upupRef = useRef<UpupUploaderRef>(null)

    const handleUpload = async () => {
        try {
            await upupRef.current?.uploadFiles()
        } catch (error) {
            console.error('Error uploading selected files:', error)
        }
    }

    return (
        <div className="flex flex-col gap-4">
            <UpupUploader
                ref={upupRef}
                provider={UpupProvider.Azure}
                tokenEndpoint="http://localhost:3001/api/storage/azure/upload-url"
                accept="*"
                maxFileSize={{ size: 10, unit: 'MB' }}
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
