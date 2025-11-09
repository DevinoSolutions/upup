import type { Meta, StoryObj } from '@storybook/react'
import React, { useRef } from 'react'
import UpupUploader, { UpupUploaderRef } from '../src/frontend/UpupUploader'
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
    render: (args, context) => {
        const isDarkMode = context.globals.theme !== 'light'

        // Create a proper component for rendering
        const RenderComponent = () => {
            const ref = useRef<UpupUploaderRef | null>(null)

            // Create a handler that gets fresh data before upload
            const handleUpload = async () => {
                if (!ref.current) return
                ref.current.useUpload().dynamicUpload([])
            }

            return (
                <div
                    style={{
                        width: '100dvw',
                        display: 'flex',
                        justifyContent: 'center',
                    }}
                    className="flex flex-col items-center gap-3"
                >
                    <UpupUploader
                        {...args}
                        dark={isDarkMode}
                        ref={ref}
                        maxFileSize={{ size: 10, unit: 'MB' }}
                        onFileUploadComplete={() => {
                            console.log('hey mazel')
                        }}
                        onFilesUploadComplete={() => {
                            console.log('lkol mazel')
                        }}
                    />
                    <button
                        className="w-fit rounded-lg bg-green-600 px-3 py-2"
                        onClick={handleUpload}
                    >
                        Upload
                    </button>
                </div>
            )
        }

        // Return the component instance
        return <RenderComponent />
    },
} satisfies Meta<typeof UpupUploader>

export const UploaderWithHook: Story = {
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
        tokenEndpoint:
            process.env.TOKEN_ENDPOINT || 'http://localhost:53010/api/upload',
        uploadAdapters: [
            UploadAdapter.INTERNAL,
            UploadAdapter.ONE_DRIVE,
            UploadAdapter.GOOGLE_DRIVE,
            UploadAdapter.DROPBOX,
            UploadAdapter.CAMERA,
            UploadAdapter.LINK,
        ],
        classNames: {
            uploadButton: 'hidden',
        },
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
