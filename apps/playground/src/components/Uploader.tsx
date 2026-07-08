'use client'

import React, { useContext } from 'react'

import { UpupUploader } from '@upup/react'
import '@upup/react/styles'
import type { LocaleBundle } from '@upup/core'
import { ThemeContext } from '@/lib/contexts'
import { clientEnv } from '@/lib/env'
import { toast } from 'react-toastify'

interface Props {
    limit: number
    mini: boolean
    theme?: string
    sources?: string[]
    allowPreview?: boolean
    shouldCompress?: boolean
    fileSizeLimit?: number
    maxRetries?: number
    locale?: LocaleBundle
    imageEditor?: boolean
}

export default function Uploader({
    limit,
    mini,
    theme = 'blue',
    sources = ['local', 'googleDrive', 'oneDrive', 'url', 'camera'],
    allowPreview = true,
    shouldCompress = false,
    fileSizeLimit = 25,
    maxRetries,
    locale,
    imageEditor = true,
}: Readonly<Props>) {
    const { isDarkMode } = useContext(ThemeContext)

    const currentTheme = theme || 'blue'
    const useRealStorage =
        clientEnv.NEXT_PUBLIC_UPUP_USE_REAL_STORAGE === 'true'
    const serverUrl = clientEnv.NEXT_PUBLIC_BASE_URL
        ? clientEnv.NEXT_PUBLIC_BASE_URL + '/api/upup'
        : '/api/upup'

    const customSlots = {
        uploader: {
            container: `uploader-container-full-${currentTheme}`,
        },
        fileList: {
            root: `uploader-file-list-${currentTheme}`,
            uploadButton: `uploader-btn-${currentTheme}`,
            doneButton: `uploader-btn-${currentTheme}`,
            addMoreButton: `uploader-add-${currentTheme}`,
        },
        sourceSelector: {
            sourceButton: `uploader-source-${currentTheme}`,
            sourceButtonIcon: `uploader-file-list-${currentTheme}`,
            sourceButtonText: `uploader-preview-${currentTheme}`,
        },
        sourceView: {
            root: `uploader-source-view-${currentTheme}`,
        },
        driveBrowser: {
            body: `uploader-drive-body-${currentTheme}`,
            addFilesButton: `uploader-btn-${currentTheme}`,
        },
        filePreview: {
            previewButton: `uploader-preview-${currentTheme}`,
        },
        progressBar: {
            track: `uploader-progress-${currentTheme}`,
            fill: `uploader-progress-${currentTheme}`,
        },
        urlUploader: {
            fetchButton: `uploader-btn-${currentTheme}`,
        },
        cameraUploader: {
            addButton: `uploader-btn-${currentTheme}`,
        },
    }

    return (
        <div className="flex flex-col justify-center items-center gap-4 w-full h-full lg:min-h-[auto] min-h-[70vh]">
            {!useRealStorage && (
                <div
                    role="status"
                    className="w-full max-w-xl rounded-md border border-amber-400 bg-amber-50 px-4 py-2 text-center text-sm font-medium text-amber-800 dark:border-amber-500/60 dark:bg-amber-500/10 dark:text-amber-300"
                >
                    MOCK MODE — files are not actually stored. Set{' '}
                    <code className="font-mono">
                        NEXT_PUBLIC_UPUP_USE_REAL_STORAGE=true
                    </code>{' '}
                    to upload to real storage.
                </div>
            )}
            <UpupUploader
                provider="backblaze"
                maxFiles={limit}
                serverUrl={useRealStorage ? serverUrl : undefined}
                uploadEndpoint={
                    useRealStorage ? undefined : '/api/upup-mock/presign'
                }
                sources={sources as any}
                cloudDrives={{
                    googleDrive: {
                        clientId: clientEnv.NEXT_PUBLIC_GOOGLE_CLIENT_ID,
                        apiKey: clientEnv.NEXT_PUBLIC_GOOGLE_API_KEY,
                        appId: clientEnv.NEXT_PUBLIC_GOOGLE_APP_ID,
                    },
                    oneDrive: {
                        clientId: clientEnv.NEXT_PUBLIC_ONEDRIVE_CLIENT_ID,
                    },
                    dropbox: {
                        clientId: clientEnv.NEXT_PUBLIC_DROPBOX_CLIENT_ID,
                    },
                }}
                theme={{
                    mode: isDarkMode ? 'dark' : 'light',
                    slots: customSlots,
                }}
                mini={mini}
                allowPreview={allowPreview}
                imageCompression={shouldCompress}
                imageEditor={imageEditor}
                maxFileSize={{ size: fileSizeLimit, unit: 'MB' }}
                maxRetries={maxRetries}
                i18n={locale ? { locale } : undefined}
                onFilesUploadComplete={files => {
                    console.log('Files processed:', files)
                    if (useRealStorage)
                        toast.success('Files uploaded successfully!')
                    else
                        toast.info(
                            'Mock mode: files were processed but NOT stored.',
                        )
                }}
                onError={e => {
                    console.error(e)
                    toast.error(e)
                }}
                onWarn={warning => {
                    console.warn(warning)
                    toast.warn(warning)
                }}
                onFileTypeMismatch={(file, acceptedTypes) => {
                    toast.error(
                        `File type not supported. Accepted types: ${acceptedTypes}`,
                    )
                }}
                onFileUploadStart={file => {
                    toast.info(`Starting upload: ${file.name}`)
                }}
                onFileUploadComplete={file => {
                    if (useRealStorage)
                        toast.success(`Upload complete: ${file.name}`)
                    else toast.info(`Mock upload (not stored): ${file.name}`)
                }}
            />
        </div>
    )
}
