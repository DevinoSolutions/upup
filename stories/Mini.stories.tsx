import type { Meta, StoryObj } from '@storybook/react'
import React from 'react'
import UpupUploader from '../src/frontend/UpupUploader'
import { UploadAdapter, UpupProvider } from '../src/shared/types'

const meta = {
    title: 'Mini Uploader',
    component: UpupUploader,
    parameters: {
        layout: 'centered',
        docs: {
            description: {
                component: 'Mini uploader',
            },
        },
    },
} satisfies Meta<typeof UpupUploader>

export default meta
type Story = StoryObj<typeof UpupUploader>

const MiniUploader = () => (
    <UpupUploader
        provider={UpupProvider.AWS}
        tokenEndpoint="http://localhost:3000/api/upload"
        limit={4}
        accept="application/pdf"
        uploadAdapters={[
            UploadAdapter.INTERNAL,
            UploadAdapter.ONE_DRIVE,
            UploadAdapter.GOOGLE_DRIVE,
            UploadAdapter.CAMERA,
            UploadAdapter.LINK,
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
        mini
    />
)

export const Default: Story = {
    render: () => <MiniUploader />,
}
