import { CircularProgress } from '@mui/material'
import { Meta } from '@storybook/react'
import React, { useRef, useState } from 'react'
import { UploadFilesRef, UpupUploader } from '../src/frontend/UpupUploader'
import {
    UPLOAD_ADAPTER,
    UploadAdapter,
} from '../src/frontend/types/UploadAdapter'
// import react only on this file to avoid error
// we get an error because we're not exporting UpupUploader as default

const meta: Meta<typeof UpupUploader> = {
    title: 'Uploader',
    component: UpupUploader,
}

export default meta

const Uploader = args => {
    const [selectedFiles, setSelectedFiles] = useState<File[]>([])
    const [uploadStatus, setUploadStatus] = useState<string>('')

    // Configure all the event handlers
    const eventHandlers = {
        onFileClick: file => {
            console.log('File clicked:', file)
        },
        onIntegrationClick: (integrationType: string) => {
            setUploadStatus(`Selected integration: ${integrationType}`)
            console.log('Integration clicked:', integrationType)
        },
        onFileUploadStart: (file: File) => {
            setUploadStatus(`Starting upload: ${file.name}`)
            console.log('Upload started:', file)
        },
        onFileUploadComplete: (file: File, key: string) => {
            setUploadStatus(`Completed upload: ${file.name}`)
            console.log('Upload completed:', { file, key })
        },
        onAllUploadsComplete: (keys: string[]) => {
            setUploadStatus('All uploads completed!')
            console.log('All uploads completed:', keys)
        },
        onFileUploadFail: (file: File, error: Error) => {
            setUploadStatus(`Upload failed: ${file.name} - ${error.message}`)
            console.error('Upload failed:', { file, error })
        },
        onFileUploadProgress: (
            file: File,
            {
                loaded,
                total,
                percentage,
            }: { loaded: number; total: number; percentage: number },
        ) => {
            setUploadStatus(`File progress - ${file.name}: ${percentage}%`)
            console.log('File progress:', { file, percentage })
        },
        onTotalUploadProgress: (
            progress: number,
            completed: number,
            total: number,
        ) => {
            setUploadStatus(
                `Overall progress: ${progress}% (${completed}/${total} files)`,
            )
            console.log('Total progress:', {
                progress,
                completedFiles: completed,
                totalFiles: total,
            })
        },
        onFileRemove: (file: File) => {
            setUploadStatus(`Removed file: ${file.name}`)
            console.log('File removed:', file)
        },
        onFileDragOver: (files: File[]) => {
            const fileNames = files.map(file => file.name).join(', ')
            setUploadStatus(`Hovering over dropzone: ${fileNames}`)
            console.log('Hovering over dropzone', files)
        },
        onFileDragLeave: (files: File[]) => {
            const fileNames = files.map(file => file.name).join(', ')
            setUploadStatus(`Left drop zone: ${fileNames}`)
            console.log('Left drop zone', files)
        },
        onFileDrop: (files: File[]) => {
            const fileNames = files.map(file => file.name).join(', ')
            setUploadStatus(`Dropped files: ${fileNames}`)
            console.log('Dropped files', files)
        },
        onFileTypeMismatch: (file: File, acceptedTypes: string) => {
            setUploadStatus(
                `File type: ${file.type} is not amongst accepted types: ${acceptedTypes}`,
            )
            console.log(
                `File type: ${file.type} is not amongst accepted types: ${acceptedTypes}`,
            )
        },
        onCancelUpload: (files: File[]) => {
            const fileNames = files.map(file => file.name).join(', ')
            setUploadStatus(`Cancelled uploading files: ${fileNames}`)
            console.log('Cancelled uploading files', files)
        },
    }

    const baseConfigs = {
        accept: '*',
        multiple: true,
        limit: 5,
        mini: false,
        onFilesSelected: (files: File[]) =>
            setSelectedFiles ? setSelectedFiles(files) : () => {},
        ...eventHandlers, // Add all our new event handlers
        ...args,
    }
    const uploadAdapters: UPLOAD_ADAPTER[] = [
        UploadAdapter.INTERNAL,
        UploadAdapter.GOOGLE_DRIVE,
        UploadAdapter.ONE_DRIVE,
        UploadAdapter.LINK,
        UploadAdapter.CAMERA,
    ]

    const upupRef = useRef<UploadFilesRef>()

    const handleUpload = async () => {
        try {
            setUploadStatus('Starting upload process...')
            const data = await upupRef.current?.uploadFiles()
            setUploadStatus(
                data ? 'Upload successful!' : 'Upload returned null',
            )
        } catch (error) {
            setUploadStatus(`Upload error: ${error.message}`)
            console.error('Error uploading selected files:', error)
        }
    }
    const handleDynamicUpload = async () => {
        try {
            setUploadStatus('Starting dynamic upload...')
            const testFiles: any[] = []
            testFiles.push(selectedFiles[0])
            const data = await upupRef.current?.dynamicUploadFiles(testFiles)
            setUploadStatus(
                data
                    ? 'Dynamic upload successful!'
                    : 'Dynamic upload returned null',
            )
        } catch (error) {
            setUploadStatus(`Dynamic upload error: ${error.message}`)
            console.error('Error uploading selected files:', error)
        }
    }

    const loader = <CircularProgress size={100} />

    return (
        <div className="space-y-4">
            {/* Status Display */}
            <div className="rounded-md bg-gray-100 p-4 dark:bg-gray-800">
                <h3 className="text-sm font-medium">Upload Status:</h3>
                <p className="text-sm text-gray-600 dark:text-gray-300">
                    {uploadStatus}
                </p>
            </div>

            <UpupUploader
                {...args}
                baseConfigs={baseConfigs}
                uploadAdapters={uploadAdapters}
                presignedUrlEndpoint="http://localhost:3001/presigned-url"
                googleConfigs={{
                    google_api_key: process.env.GOOGLE_API_KEY,
                    google_app_id: process.env.GOOGLE_APP_ID,
                    google_client_id: process.env.GOOGLE_CLIENT_ID,
                }}
                oneDriveConfigs={{
                    onedrive_client_id: process.env.ONEDRIVE_CLIENT_ID,
                    redirectUri: window.location.href,
                }}
                loader={loader}
                ref={upupRef}
            />

            <div className="flex gap-3">
                <button
                    className="rounded-md border-2 border-red-100 px-4 py-2 hover:bg-red-50 dark:hover:bg-red-900"
                    onClick={handleUpload}
                >
                    Upload
                </button>
                <button
                    className="rounded-md border-2 border-red-100 px-4 py-2 hover:bg-red-50 dark:hover:bg-red-900"
                    onClick={handleDynamicUpload}
                >
                    Dynamic Upload
                </button>
            </div>
        </div>
    )
}

export const Default = () => Uploader({})
export const Mini = () => Uploader({ mini: true })
