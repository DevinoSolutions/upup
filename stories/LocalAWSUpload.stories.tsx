import type { Meta, StoryObj } from '@storybook/react'
import React, { useRef } from 'react'
import UpupUploader from '../src/frontend/UpupUploader'
import {
    UploadAdapter,
    UpupProvider,
    UpupUploaderRef,
} from '../src/shared/types'

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
                provider={UpupProvider.AWS}
                tokenEndpoint="http://localhost:3000/api/upload"
                limit={4}
                accept="application/pdf"
                uploadAdapters={[
                    UploadAdapter.INTERNAL,
                    UploadAdapter.ONE_DRIVE,
                    UploadAdapter.GOOGLE_DRIVE,
                ]}
                driveConfigs={{
                    googleDrive: {
                        google_client_id: process.env.GOOGLE_CLIENT_ID!,
                        google_api_key: process.env.GOOGLE_API_KEY!,
                        google_app_id: process.env.GOOGLE_APP_ID!,
                    },
                    oneDrive: {
                        onedrive_client_id: process.env.ONEDRIVE_CLIENT_ID!,
                    },
                }}
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
