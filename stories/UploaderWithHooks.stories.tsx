import type { Meta, StoryObj } from '@storybook/react'
import React, { useEffect, useRef, useState } from 'react'
import UpupUploader, { UpupUploaderRef } from '../src/frontend/UpupUploader'
import {
    FileWithProgress,
    UploadAdapter,
    UpupProvider,
} from '../src/shared/types'

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
            const [uploadData, setUploadData] = useState<
                ReturnType<UpupUploaderRef['useUpload']>
            >({
                files: [],
                loading: false,
                progress: 0,
                upload: async () => [],
                error: undefined,
            })

            // Track files directly instead of through a derived value
            const [files, setFiles] = useState([] as Array<FileWithProgress>)

            // Function to refresh all upload data
            const refreshUploadData = () => {
                if (!ref.current) return
                const data = ref.current.useUpload()

                setUploadData(data)
                setFiles(data.files)
                console.log(data.files)
            }

            // Update uploadData only when ref is initialized
            useEffect(() => {
                // Only run once when ref is set
                if (ref.current) refreshUploadData()
            }, []) // Empty dependency array to run only once after initial render

            // Set up polling for progress updates during upload
            useEffect(() => {
                if (!uploadData?.loading) return

                // Poll for progress updates during upload
                const intervalId = setInterval(refreshUploadData, 100)

                return () => clearInterval(intervalId)
            }, [uploadData?.loading])

            // Create a handler that gets fresh data before upload
            const handleUpload = async () => {
                if (!ref.current) return

                // Get the latest data right before upload
                const freshData = ref.current.useUpload()

                // Start polling for updates
                refreshUploadData()

                const result = await freshData.upload()

                // Get final state after upload completes
                setTimeout(refreshUploadData, 0)

                return result
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
                        onFilesSelected={() => {
                            // Use setTimeout to ensure we get the updated state after React has processed the file selection
                            setTimeout(refreshUploadData, 0)
                        }}
                        onError={() => {
                            // Use setTimeout to ensure we get the updated state after React has processed the error
                            setTimeout(refreshUploadData, 0)
                        }}
                        onFileUploadProgress={() => {
                            // Update progress data
                            refreshUploadData()
                        }}
                        onFilesUploadProgress={() => {
                            // Update progress data
                            refreshUploadData()
                        }}
                        onFileUploadComplete={() => {
                            // Update state after upload completes
                            setTimeout(refreshUploadData, 0)
                        }}
                        onFilesUploadComplete={() => {
                            // Update state after all uploads complete
                            setTimeout(refreshUploadData, 0)
                        }}
                    />
                    <button
                        className="w-fit rounded-lg bg-green-600 px-3 py-2"
                        onClick={handleUpload}
                        disabled={uploadData.loading}
                    >
                        Upload
                    </button>
                    <div>Files selected: {files.length}</div>
                    {uploadData.loading && (
                        <div>Upload progress: {uploadData.progress}%</div>
                    )}
                    {uploadData.error && (
                        <div className="text-red-500">
                            Error: {uploadData.error}
                        </div>
                    )}
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
        },
        limit: 10,
        provider: UpupProvider.BackBlaze,
        tokenEndpoint: 'https://localhost:3000/api/upload',
        uploadAdapters: [
            UploadAdapter.INTERNAL,
            UploadAdapter.ONE_DRIVE,
            UploadAdapter.GOOGLE_DRIVE,
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
