'use client'

import { motion } from 'framer-motion'
import React, { memo, useCallback, useState } from 'react'
import { TbPlayerPauseFilled, TbPlayerPlayFilled } from 'react-icons/tb'
import { useUploaderContext } from '../context/uploader-context'
import { cn } from '../lib/tailwind'
import ProgressBar from './progress-bar'

// TODO: Import FileItem once migrated (Task 3.8)

function formatBytes(bytes: number): string {
    if (bytes === 0) return '0 B'
    const k = 1024
    const sizes = ['B', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i]
}

export type FileListProps = {
    className?: string
}

export default memo(function FileList({ className }: FileListProps) {
    const {
        activeSource,
        files,
        status,
        progress,
        upload,
        pause,
        resume,
        cancel,
        dark,
        classNames,
        mini,
    } = useUploaderContext()

    const [draggedFileId, setDraggedFileId] = useState<string>()
    const [dropTargetFileId, setDropTargetFileId] = useState<string>()

    // isAddingMore is not yet in context — default false
    const isAddingMore = false

    const isHidden = isAddingMore || !!activeSource || !files.length

    const isUploading = status === 'uploading'
    const isPaused = status === 'paused'
    const isSuccessful = status === 'complete'
    const isFailed = status === 'error'

    const totalProgress = progress?.percentage ?? 0

    const clearDragState = useCallback(() => {
        setDraggedFileId(undefined)
        setDropTargetFileId(undefined)
    }, [])

    if (mini) return null

    return (
        <div
            className={cn(
                'upup-relative upup-flex upup-h-full upup-flex-col upup-rounded-lg upup-shadow',
                { 'upup-hidden': isHidden },
                className,
            )}
        >
            {/* Header */}
            <div
                className={cn(
                    'upup-shadow-bottom upup-flex upup-items-center upup-justify-between upup-rounded-t-lg upup-bg-black/[0.025] upup-px-3 upup-py-2 upup-text-sm',
                    { 'upup-bg-white/5 dark:upup-bg-white/5': dark },
                    (classNames as any)?.containerHeader,
                )}
            >
                <button
                    className={cn(
                        'upup-text-blue-600',
                        {
                            'upup-text-[#30C5F7] dark:upup-text-[#30C5F7]':
                                dark,
                        },
                        (classNames as any)?.containerCancelButton,
                    )}
                    onClick={cancel}
                    disabled={isUploading}
                >
                    Remove all
                </button>
                <span
                    className={cn('upup-text-[#6D6D6D]', {
                        'upup-text-gray-300 dark:upup-text-gray-300': dark,
                    })}
                    aria-live="polite"
                >
                    {files.length} file{files.length !== 1 ? 's' : ''} selected
                </span>
            </div>

            {/* File list */}
            <motion.div
                className={cn(
                    'upup-preview-scroll upup-flex upup-flex-1 upup-flex-col upup-overflow-y-auto upup-bg-black/[0.075] upup-p-3',
                    { 'upup-bg-white/10 dark:upup-bg-white/10': dark },
                    (classNames as any)?.fileListContainer,
                )}
            >
                <div
                    role="list"
                    aria-live="polite"
                    className={cn(
                        'upup-flex upup-flex-col upup-gap-3 upup-font-[Arial,Helvetica,sans-serif]',
                        {
                            'md:upup-grid md:upup-gap-y-6 md:upup-grid-cols-2':
                                files.length > 1,
                            'upup-flex-1': files.length === 1,
                        },
                    )}
                >
                    {files.map(file => {
                        const isDraggedFile = draggedFileId === file.id
                        const isDropTarget =
                            dropTargetFileId === file.id &&
                            draggedFileId !== file.id

                        return (
                            <div
                                key={file.id}
                                role="listitem"
                                className={cn(
                                    'upup-rounded-xl upup-transition',
                                    {
                                        'upup-opacity-60': isDraggedFile,
                                        'upup-ring-2 upup-ring-blue-400':
                                            isDropTarget && !dark,
                                        'upup-ring-2 upup-ring-[#30C5F7]':
                                            isDropTarget && dark,
                                    },
                                )}
                                data-upup-file-id={file.id}
                            >
                                {/* TODO: <FileItem file={file} /> — wire up after migration (Task 3.8) */}
                                <div className="upup-text-sm upup-truncate">
                                    {file.name}
                                </div>
                            </div>
                        )
                    })}
                </div>
            </motion.div>

            {/* Footer */}
            <div
                className={cn(
                    'upup-shadow-top upup-flex upup-items-center upup-gap-3 upup-rounded-b-lg upup-bg-black/[0.025] upup-px-3 upup-py-2',
                    { 'upup-bg-white/5 dark:upup-bg-white/5': dark },
                    (classNames as any)?.fileListFooter,
                )}
            >
                {!isSuccessful && !isFailed && (
                    <button
                        className={cn(
                            'upup-disabled:animate-pulse upup-ml-auto upup-rounded-full upup-bg-blue-600 upup-px-4 upup-py-2 upup-text-sm upup-font-medium upup-text-white',
                            {
                                'upup-bg-[#30C5F7] dark:upup-bg-[#30C5F7]':
                                    dark,
                            },
                            (classNames as any)?.uploadButton,
                        )}
                        onClick={() => upload()}
                        disabled={isUploading || isPaused}
                    >
                        Upload {files.length} file{files.length !== 1 ? 's' : ''}
                    </button>
                )}
                {isFailed && (
                    <button
                        className={cn(
                            'upup-disabled:animate-pulse upup-ml-auto upup-rounded-full upup-bg-red-600 upup-px-4 upup-py-2 upup-text-sm upup-font-medium upup-text-white',
                            { 'upup-bg-red-500 dark:upup-bg-red-500': dark },
                            (classNames as any)?.uploadButton,
                        )}
                        onClick={() => upload()}
                    >
                        Retry Upload
                    </button>
                )}
                {isSuccessful && (
                    <button
                        className={cn(
                            'upup-disabled:animate-pulse upup-ml-auto upup-rounded-lg upup-bg-blue-600 upup-px-3 upup-py-2 upup-text-sm upup-font-medium upup-text-white',
                            {
                                'upup-bg-[#30C5F7] dark:upup-bg-[#30C5F7]':
                                    dark,
                            },
                            (classNames as any)?.uploadDoneButton,
                        )}
                        onClick={cancel}
                    >
                        Done
                    </button>
                )}
                <div className="upup-flex upup-flex-1 upup-flex-col upup-gap-1">
                    <div className="upup-flex upup-items-center upup-gap-2">
                        {(isUploading || isPaused) && (
                            <button
                                className={cn(
                                    'upup-flex upup-h-7 upup-w-7 upup-items-center upup-justify-center upup-rounded-full upup-bg-gray-200 upup-text-gray-700 upup-transition-colors hover:upup-bg-gray-300',
                                    {
                                        'upup-bg-white/10 upup-text-white hover:upup-bg-white/20':
                                            dark,
                                    },
                                )}
                                onClick={isPaused ? resume : pause}
                                title={
                                    isPaused ? 'Resume upload' : 'Pause upload'
                                }
                                aria-label={
                                    isPaused ? 'Resume upload' : 'Pause upload'
                                }
                            >
                                {isPaused ? (
                                    <TbPlayerPlayFilled size={14} />
                                ) : (
                                    <TbPlayerPauseFilled size={14} />
                                )}
                            </button>
                        )}
                        <ProgressBar
                            className="upup-flex-1"
                            progressBarClassName="upup-rounded"
                            progress={totalProgress}
                            showValue
                            dark={dark}
                        />
                    </div>
                </div>
            </div>
        </div>
    )
})
