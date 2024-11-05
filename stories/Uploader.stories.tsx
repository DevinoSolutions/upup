import { CircularProgress } from '@mui/material'
import { Meta } from '@storybook/react'
import { useRef, useState } from 'react'
import {
    UPLOAD_ADAPTER,
    UploadAdapter,
    UploadFilesRef,
    UpupUploader,
} from '../src'
import { useUpup } from '../src/hooks'

const meta: Meta<typeof UpupUploader> = {
    title: 'Uploader',
    component: UpupUploader,
}

export default meta

const Uploader = args => {
    const [files, setFiles] = useState<File[]>([])
    const [uploadStatus, setUploadStatus] = useState<string>('')

    // Configure all the event handlers
    const eventHandlers = {
        onFileClick: file => {
            console.log('File clicked:', file)
        },
        onFilesChange: files => {
            console.log('Files changed:', files)
            return files
        },
        onClick: (integrationType: string) => {
            setUploadStatus(`Selected integration: ${integrationType}`)
            console.log('Integration clicked:', integrationType)
        },
        onUpload: (file: File) => {
            setUploadStatus(`Starting upload: ${file.name}`)
            console.log('Upload started:', file)
        },
        onCompletedUpload: (file: File, key: string) => {
            setUploadStatus(`Completed upload: ${file.name}`)
            console.log('Upload completed:', { file, key })
        },
        onAllCompleted: (keys: string[]) => {
            setUploadStatus('All uploads completed!')
            console.log('All uploads completed:', keys)
        },
        onUploadFail: (file: File, error: Error) => {
            setUploadStatus(`Upload failed: ${file.name} - ${error.message}`)
            console.error('Upload failed:', { file, error })
        },
        onFileProgress: (file: File, progress: number) => {
            setUploadStatus(`File progress - ${file.name}: ${progress}%`)
            console.log('File progress:', { file, progress })
        },
        onTotalProgress: (
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
        onDragOver: (files: File[]) => {
            const fileNames = files.map(file => file.name).join(', ')
            setUploadStatus(`Hovering over dropzone: ${fileNames}`)
            console.log('Hovering over dropzone', files)
        },
        onDragLeave: (files: File[]) => {
            const fileNames = files.map(file => file.name).join(', ')
            setUploadStatus(`Left drop zone: ${fileNames}`)
            console.log('Left drop zone', files)
        },
        onDrop: (files: File[]) => {
            const fileNames = files.map(file => file.name).join(', ')
            setUploadStatus(`Dropped files: ${fileNames}`)
            console.log('Dropped files', files)
        },
    }

    const { baseConfigs, cloudStorageConfigs, googleConfigs, oneDriveConfigs } =
        useUpup({
            setFiles: setFiles,
            accept: '*',
            multiple: true,
            limit: 5,
            ...eventHandlers, // Add all our new event handlers
            ...args,
        })

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
            console.log(`Upload ${data ? 'successful' : 'returned null.'} `)
        } catch (error) {
            setUploadStatus(`Upload error: ${error.message}`)
            console.error('Error uploading files:', error)
        }
    }

    const handleDynamicUpload = async () => {
        try {
            setUploadStatus('Starting dynamic upload...')
            const testFiles: any[] = []
            testFiles.push(files[0])
            const data = await upupRef.current?.dynamicUploadFiles(testFiles)
            setUploadStatus(
                data
                    ? 'Dynamic upload successful!'
                    : 'Dynamic upload returned null',
            )
            console.log(`Upload ${data ? 'successful' : 'returned null.'} `)
        } catch (error) {
            setUploadStatus(`Dynamic upload error: ${error.message}`)
            console.error('Error uploading files:', error)
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
                cloudStorageConfigs={cloudStorageConfigs}
                googleConfigs={googleConfigs}
                oneDriveConfigs={oneDriveConfigs}
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
