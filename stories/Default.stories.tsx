import type { Meta, StoryObj } from '@storybook/react'
import React from 'react'
import UpupUploader from '../src/frontend/UpupUploader'
import { UploadAdapter, UpupProvider } from '../src/shared/types'

type Story = StoryObj<typeof UpupUploader>

const meta = {
    title: 'UpUpUploader',
    component: UpupUploader,
    parameters: {
        layout: 'centered',
        docs: {
            description: {
                component: 'Upload local files easily to any Cloud storage.',
            },
        },
    },
    argTypes: {
        limit: {
            control: {
                type: 'range',
                min: 1,
                max: 30,
                step: 1,
            },
        },
        uploadAdapters: {
            control: 'inline-check',
            options: [
                UploadAdapter.INTERNAL,
                UploadAdapter.ONE_DRIVE,
                UploadAdapter.GOOGLE_DRIVE,
                UploadAdapter.CAMERA,
                UploadAdapter.LINK,
            ],
        },
    },
    render: (args, ...rest) => {
        const isDarkMode = rest[0].globals.theme !== 'light'
        return (
            <div
                style={{
                    width: '100dvw',
                    display: 'flex',
                    justifyContent: 'center',
                }}
            >
                <UpupUploader {...args} dark={isDarkMode} />
            </div>
        )
    },
} satisfies Meta<typeof UpupUploader>

export const Default: Story = {
    args: {
        driveConfigs: {
            googleDrive: {
                google_client_id: process.env.GOOGLE_CLIENT_ID!,
                google_api_key: process.env.GOOGLE_API_KEY!,
                google_app_id: process.env.GOOGLE_APP_ID!,
            },
            oneDrive: {
                onedrive_client_id: process.env.ONEDRIVE_CLIENT_ID!,
            },
        },
        limit: 10,
        provider: UpupProvider.BackBlaze,
        tokenEndpoint: 'https://localhost:3000/api/upload',
    },
    parameters: {
        controls: {
            sort: 'requiredFirst',
            include: [
                'maxFileSize',
                'driveConfigs',
                'uploadAdapters',
                'shouldCompress',
                'accept',
                'limit',
                'mini',
            ],
        },
    },
}

export default meta
