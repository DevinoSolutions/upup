import { motion } from 'framer-motion'
import React, { memo } from 'react'
import {
    TbPlayerPauseFilled,
    TbPlayerPlayFilled,
} from 'react-icons/tb'
import { plural, t } from '../../shared/i18n'
import { UploadStatus, useRootContext } from '../context/RootContext'
import { cn } from '../lib/tailwind'
import FileItem from './FileItem'
import MainBoxHeader from './shared/MainBoxHeader'
import MyAnimatePresence from './shared/MyAnimatePresence'
import ProgressBar from './shared/ProgressBar'
import ShouldRender from './shared/ShouldRender'

function formatBytes(bytes: number): string {
    if (bytes === 0) return '0 B'
    const k = 1024
    const sizes = ['B', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i]
}

function formatEta(seconds: number): string {
    if (seconds <= 0 || !isFinite(seconds)) return ''
    const m = Math.floor(seconds / 60)
    const s = seconds % 60
    if (m > 0) return `${m}m ${s}s left`
    return `${s}s left`
}

export default memo(function FileList() {
    const {
        isAddingMore,
        activeAdapter,
        files,
        translations: tr,
        upload: {
            proceedUpload,
            uploadStatus,
            totalProgress,
            uploadSpeed,
            uploadEta,
            uploadedBytes,
            totalBytes,
        },
        props: { dark, classNames, isProcessing, maxRetries, resumable },
        handleDone,
        handleCancel,
        handlePause,
        handleResume,
    } = useRootContext()

    return (
        <div
            className={cn(
                'upup-relative upup-flex upup-h-full upup-flex-col upup-rounded-lg upup-shadow',
                {
                    'upup-hidden': isAddingMore || activeAdapter || !files.size,
                },
            )}
        >
            <MainBoxHeader handleCancel={handleCancel} />

            <MyAnimatePresence>
                <motion.div
                    className={cn(
                        'upup-preview-scroll upup-flex upup-flex-1 upup-flex-col upup-overflow-y-auto upup-bg-black/[0.075] upup-p-3',
                        { 'upup-bg-white/10 dark:upup-bg-white/10': dark },
                        classNames.fileListContainer,
                    )}
                >
                    <div
                        className={cn(
                            // Always-on classes
                            ` ${
                                isProcessing &&
                                'upup-pointer-events-none upup-opacity-75'
                            }  upup-flex upup-flex-col upup-gap-3 upup-font-[Arial,Helvetica,sans-serif]`,
                            {
                                'md:upup-grid md:upup-gap-y-6': files.size > 1,
                                'md:upup-grid-cols-2': files.size > 1,
                                'upup-flex-1': files.size === 1,
                                [classNames.fileListContainerInnerMultiple!]:
                                    classNames.fileListContainerInnerMultiple &&
                                    files.size > 1,
                                [classNames.fileListContainerInnerSingle!]:
                                    classNames.fileListContainerInnerSingle &&
                                    files.size === 1,
                            },
                        )}
                    >
                        {Array.from(files.values())
                            .sort((a: any, b: any) => {
                                const pa: string =
                                    (a as any).relativePath ||
                                    (a as any).webkitRelativePath ||
                                    a.name
                                const pb: string =
                                    (b as any).relativePath ||
                                    (b as any).webkitRelativePath ||
                                    b.name
                                return (
                                    pa.localeCompare(pb) ||
                                    a.name.localeCompare(b.name)
                                )
                            })
                            .map(file => (
                                <FileItem key={file.id} file={file} />
                            ))}
                    </div>
                </motion.div>
            </MyAnimatePresence>
            <div
                className={cn(
                    'upup-shadow-top upup-flex upup-items-center upup-gap-3 upup-rounded-b-lg upup-bg-black/[0.025] upup-px-3 upup-py-2',
                    {
                        'upup-bg-white/5 dark:upup-bg-white/5': dark,
                    },
                    classNames.fileListFooter,
                )}
            >
                {/* FIX: Hide upload button when status is SUCCESSFUL or FAILED */}
                <ShouldRender
                    if={
                        uploadStatus !== UploadStatus.SUCCESSFUL &&
                        uploadStatus !== UploadStatus.FAILED
                    }
                >
                    <button
                        className={cn(
                            'upup-disabled:animate-pulse upup-ml-auto upup-rounded-full upup-bg-blue-600 upup-px-4 upup-py-2 upup-text-sm upup-font-medium upup-text-white',
                            {
                                'upup-bg-[#30C5F7] dark:upup-bg-[#30C5F7]':
                                    dark,
                            },
                            classNames.uploadButton,
                        )}
                        onClick={() => {
                            proceedUpload()
                        }}
                        disabled={
                            uploadStatus === UploadStatus.ONGOING ||
                            uploadStatus === UploadStatus.PAUSED ||
                            isProcessing
                        }
                    >
                        {t(plural(tr, 'uploadFiles', files.size), {
                            count: files.size,
                        })}
                    </button>
                </ShouldRender>
                <ShouldRender
                    if={uploadStatus === UploadStatus.FAILED && !maxRetries}
                >
                    <button
                        className={cn(
                            'upup-disabled:animate-pulse upup-ml-auto upup-rounded-full upup-bg-red-600 upup-px-4 upup-py-2 upup-text-sm upup-font-medium upup-text-white',
                            {
                                'upup-bg-red-500 dark:upup-bg-red-500': dark,
                            },
                            classNames.uploadButton,
                        )}
                        onClick={() => {
                            proceedUpload()
                        }}
                    >
                        {resumable?.mode === 'multipart'
                            ? 'Resume Upload'
                            : 'Retry Upload'}
                    </button>
                </ShouldRender>
                <ShouldRender if={uploadStatus === UploadStatus.SUCCESSFUL}>
                    <button
                        className={cn(
                            'upup-disabled:animate-pulse upup-ml-auto upup-rounded-lg upup-bg-blue-600 upup-px-3 upup-py-2 upup-text-sm upup-font-medium upup-text-white',
                            {
                                'upup-bg-[#30C5F7] dark:upup-bg-[#30C5F7]':
                                    dark,
                            },
                            classNames.uploadDoneButton,
                        )}
                        onClick={handleDone}
                    >
                        {tr.done}
                    </button>
                </ShouldRender>
                <div className="upup-flex upup-flex-1 upup-flex-col upup-gap-1">
                    <div className="upup-flex upup-items-center upup-gap-2">
                        <ShouldRender
                            if={
                                resumable?.mode === 'multipart' &&
                                (uploadStatus === UploadStatus.ONGOING ||
                                    uploadStatus === UploadStatus.PAUSED)
                            }
                        >
                            <button
                                className={cn(
                                    'upup-flex upup-h-7 upup-w-7 upup-items-center upup-justify-center upup-rounded-full upup-bg-gray-200 upup-text-gray-700 upup-transition-colors hover:upup-bg-gray-300',
                                    {
                                        'upup-bg-white/10 upup-text-white hover:upup-bg-white/20':
                                            dark,
                                    },
                                )}
                                onClick={
                                    uploadStatus === UploadStatus.PAUSED
                                        ? handleResume
                                        : handlePause
                                }
                                title={
                                    uploadStatus === UploadStatus.PAUSED
                                        ? 'Resume upload'
                                        : 'Pause upload'
                                }
                            >
                                {uploadStatus === UploadStatus.PAUSED ? (
                                    <TbPlayerPlayFilled size={14} />
                                ) : (
                                    <TbPlayerPauseFilled size={14} />
                                )}
                            </button>
                        </ShouldRender>
                        <ProgressBar
                            className="upup-flex-1"
                            progressBarClassName="upup-rounded"
                            progress={totalProgress}
                            showValue
                        />
                    </div>
                    <ShouldRender
                        if={
                            (uploadStatus === UploadStatus.ONGOING ||
                                uploadStatus === UploadStatus.PAUSED) &&
                            totalBytes > 0
                        }
                    >
                        <div
                            className={cn(
                                'upup-flex upup-items-center upup-justify-between upup-text-[11px] upup-text-gray-500',
                                {
                                    'upup-text-gray-400': dark,
                                },
                            )}
                        >
                            <span>
                                {formatBytes(uploadedBytes)} of{' '}
                                {formatBytes(totalBytes)}
                                {uploadSpeed > 0 &&
                                    ` · ${formatBytes(uploadSpeed)}/s`}
                            </span>
                            <ShouldRender
                                if={
                                    uploadStatus === UploadStatus.ONGOING &&
                                    uploadEta > 0
                                }
                            >
                                <span>{formatEta(uploadEta)}</span>
                            </ShouldRender>
                            <ShouldRender
                                if={uploadStatus === UploadStatus.PAUSED}
                            >
                                <span>Paused</span>
                            </ShouldRender>
                        </div>
                    </ShouldRender>
                </div>
            </div>
        </div>
    )
})
