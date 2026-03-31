import { motion } from 'framer-motion'
import React, { memo, useCallback, useEffect, useMemo, useState } from 'react'
import { TbPlayerPauseFilled, TbPlayerPlayFilled } from 'react-icons/tb'
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
        canReorderFiles,
        reorderFiles,
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
        props: {
            dark,
            classNames,
            isProcessing,
            maxRetries,
            resumable,
            minFiles,
            hideUploadButton,
            disabled,
            hidePauseResumeButton,
            hideProgressAfterFinish,
            hideRetryButton,
            showSelectedFiles,
        },
        handleDone,
        handleCancel,
        handlePause,
        handleResume,
    } = useRootContext()
    const [draggedFileId, setDraggedFileId] = useState<string>()
    const [dropTargetFileId, setDropTargetFileId] = useState<string>()

    const orderedFiles = useMemo(() => Array.from(files.values()), [files])
    const isReorderEnabled = useMemo(
        () =>
            canReorderFiles &&
            !isProcessing &&
            uploadStatus !== UploadStatus.ONGOING &&
            uploadStatus !== UploadStatus.PAUSED &&
            uploadStatus !== UploadStatus.SUCCESSFUL,
        [canReorderFiles, isProcessing, uploadStatus],
    )

    const clearDragState = useCallback(() => {
        setDraggedFileId(undefined)
        setDropTargetFileId(undefined)
    }, [])

    useEffect(() => {
        if (!isReorderEnabled) {
            clearDragState()
        }
    }, [clearDragState, isReorderEnabled])

    const handleDragStart = useCallback(
        (fileId: string) => (e: React.DragEvent<HTMLDivElement>) => {
            if (!isReorderEnabled) return

            setDraggedFileId(fileId)
            e.dataTransfer.effectAllowed = 'move'
            e.dataTransfer.setData('text/plain', fileId)
        },
        [isReorderEnabled],
    )

    const handleDragOver = useCallback(
        (fileId: string) => (e: React.DragEvent<HTMLDivElement>) => {
            if (!isReorderEnabled || draggedFileId === fileId) return

            e.preventDefault()
            e.dataTransfer.dropEffect = 'move'
            setDropTargetFileId(fileId)
        },
        [draggedFileId, isReorderEnabled],
    )

    const handleDrop = useCallback(
        (targetId: string) => (e: React.DragEvent<HTMLDivElement>) => {
            if (!isReorderEnabled) return

            e.preventDefault()
            const sourceId =
                draggedFileId || e.dataTransfer.getData('text/plain')
            if (sourceId && sourceId !== targetId) {
                reorderFiles(sourceId, targetId)
            }
            clearDragState()
        },
        [clearDragState, draggedFileId, isReorderEnabled, reorderFiles],
    )

    const handleDragLeave = useCallback(
        (fileId: string) => () => {
            if (dropTargetFileId === fileId) {
                setDropTargetFileId(undefined)
            }
        },
        [dropTargetFileId],
    )

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

            <ShouldRender if={showSelectedFiles}>
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
                                    'md:upup-grid md:upup-gap-y-6':
                                        files.size > 1,
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
                            {orderedFiles.map(file => {
                                const isDraggedFile = draggedFileId === file.id
                                const isDropTarget =
                                    dropTargetFileId === file.id &&
                                    draggedFileId !== file.id

                                return (
                                    <div
                                        key={file.id}
                                        className={cn(
                                            'upup-rounded-xl upup-transition',
                                            {
                                                'upup-cursor-grab active:upup-cursor-grabbing':
                                                    isReorderEnabled,
                                                'upup-opacity-60':
                                                    isDraggedFile,
                                                'upup-ring-2 upup-ring-blue-400':
                                                    isDropTarget && !dark,
                                                'upup-ring-2 upup-ring-[#30C5F7]':
                                                    isDropTarget && dark,
                                            },
                                        )}
                                        draggable={isReorderEnabled}
                                        onDragStart={handleDragStart(file.id)}
                                        onDragOver={handleDragOver(file.id)}
                                        onDragLeave={handleDragLeave(file.id)}
                                        onDrop={handleDrop(file.id)}
                                        onDragEnd={clearDragState}
                                        aria-grabbed={
                                            isReorderEnabled
                                                ? isDraggedFile
                                                : undefined
                                        }
                                        data-upup-file-id={file.id}
                                    >
                                        <FileItem file={file} />
                                    </div>
                                )
                            })}
                        </div>
                    </motion.div>
                </MyAnimatePresence>
            </ShouldRender>
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
                        !hideUploadButton &&
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
                            isProcessing ||
                            disabled ||
                            (!!minFiles && files.size < minFiles)
                        }
                    >
                        {t(plural(tr, 'uploadFiles', files.size), {
                            count: files.size,
                        })}
                    </button>
                </ShouldRender>
                <ShouldRender
                    if={
                        uploadStatus === UploadStatus.FAILED &&
                        !maxRetries &&
                        !hideRetryButton
                    }
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
                                !hidePauseResumeButton &&
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
                                aria-label={
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
                        <ShouldRender
                            if={
                                !(
                                    hideProgressAfterFinish &&
                                    uploadStatus === UploadStatus.SUCCESSFUL
                                )
                            }
                        >
                            <ProgressBar
                                className="upup-flex-1"
                                progressBarClassName="upup-rounded"
                                progress={totalProgress}
                                showValue
                            />
                        </ShouldRender>
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
                            aria-live="polite"
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
