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
                UploadAdapter.DROPBOX,
                UploadAdapter.CAMERA,
                UploadAdapter.LINK,
            ],
        },
    },
    render: (args, context) => {
        const isDarkMode = context.globals.theme !== 'light'

        return (
            <div
                style={{
                    width: '100dvw',
                    display: 'flex',
                    justifyContent: 'center',
                }}
            >
                <UpupUploader
                    allowPreview={false}
                    onFilesSelected={files => {
                        console.log(files)
                    }}
                    onError={error => {
                        console.error('UpupUploader Error:', error)
                    }}
                    {...args}
                    dark={isDarkMode}
                />
            </div>
        )
    },
} satisfies Meta<typeof UpupUploader>

export const UploaderWithButton: Story = {
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
            dropbox: {
                dropbox_client_id: process.env.DROPBOX_CLIENT_ID!,
                dropbox_redirect_uri: process.env.DROPBOX_REDIRECT_URI!,
            },
        },
        limit: 10,
        provider: UpupProvider.BackBlaze,
        tokenEndpoint: 'https://localhost:3000/api/upload',
        uploadAdapters: [
            UploadAdapter.INTERNAL,
            UploadAdapter.ONE_DRIVE,
            UploadAdapter.GOOGLE_DRIVE,
            UploadAdapter.DROPBOX,
            UploadAdapter.CAMERA,
            UploadAdapter.LINK,
        ],
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
