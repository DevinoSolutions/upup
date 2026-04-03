'use client'

import { motion } from 'framer-motion'
import React, { memo, useCallback, useState } from 'react'
import { TbPlayerPauseFilled, TbPlayerPlayFilled } from 'react-icons/tb'
import { UploadStatus } from '@upup/shared'
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
        reorderFiles,
        resolvedTheme,
        mini,
        t,
    } = useUploaderContext()

    const [draggedFileId, setDraggedFileId] = useState<string>()
    const [dropTargetFileId, setDropTargetFileId] = useState<string>()

    // isAddingMore is not yet in context — default false
    const isAddingMore = false

    const isHidden = isAddingMore || !!activeSource || !files.length

    const isUploading = status === UploadStatus.UPLOADING
    const isPaused = status === UploadStatus.PAUSED
    const isSuccessful = status === UploadStatus.SUCCESSFUL
    const isFailed = status === UploadStatus.FAILED

    const totalProgress = progress?.percentage ?? 0

    const clearDragState = useCallback(() => {
        setDraggedFileId(undefined)
        setDropTargetFileId(undefined)
    }, [])

    const handleDragStart = useCallback((fileId: string) => {
        setDraggedFileId(fileId)
    }, [])

    const handleDragOver = useCallback(
        (e: React.DragEvent, fileId: string) => {
            e.preventDefault()
            if (draggedFileId && draggedFileId !== fileId) {
                setDropTargetFileId(fileId)
            }
        },
        [draggedFileId],
    )

    const handleDrop = useCallback(
        (e: React.DragEvent, targetFileId: string) => {
            e.preventDefault()
            if (!draggedFileId || draggedFileId === targetFileId) {
                clearDragState()
                return
            }
            const ids = files.map(f => f.id)
            const fromIdx = ids.indexOf(draggedFileId)
            const toIdx = ids.indexOf(targetFileId)
            if (fromIdx !== -1 && toIdx !== -1) {
                ids.splice(fromIdx, 1)
                ids.splice(toIdx, 0, draggedFileId)
                reorderFiles(ids)
            }
            clearDragState()
        },
        [draggedFileId, files, reorderFiles, clearDragState],
    )

    if (mini) return null

    return (
        <div
            className={cn(
                'upup-relative upup-flex upup-h-full upup-flex-col upup-rounded-lg upup-shadow',
                { 'upup-hidden': isHidden },
                className,
            )}
            data-upup-slot="fileList.root"
        >
            {/* Header */}
            <div
                className="upup-shadow-bottom upup-flex upup-items-center upup-justify-between upup-rounded-t-lg upup-px-3 upup-py-2 upup-text-sm"
                style={{ backgroundColor: 'var(--upup-color-surface-alt)' }}
                data-upup-slot="fileList.header"
            >
                <button
                    className="upup-font-medium"
                    style={{ color: 'var(--upup-color-primary)' }}
                    onClick={cancel}
                    disabled={isUploading}
                    data-upup-slot="fileList.cancelButton"
                >
                    {t('header.removeAllFiles')}
                </button>
                <span
                    style={{ color: 'var(--upup-color-text-muted)' }}
                    aria-live="polite"
                    data-upup-slot="fileList.fileCount"
                >
                    {t('header.filesSelected', { count: files.length })}
                </span>
            </div>

            {/* File list */}
            <motion.div
                className="upup-preview-scroll upup-flex upup-flex-1 upup-flex-col upup-overflow-y-auto upup-p-3"
                style={{ backgroundColor: 'var(--upup-color-surface-alt)', opacity: 0.9 }}
                data-upup-slot="fileList.body"
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
                                draggable={!isUploading}
                                onDragStart={() => handleDragStart(file.id)}
                                onDragOver={(e) => handleDragOver(e, file.id)}
                                onDrop={(e) => handleDrop(e, file.id)}
                                onDragEnd={clearDragState}
                                className={cn(
                                    'upup-cursor-grab upup-rounded-xl upup-transition',
                                    {
                                        'upup-opacity-60': isDraggedFile,
                                        'upup-ring-2': isDropTarget,
                                    },
                                )}
                                style={{
                                    ...(isDropTarget
                                        ? { '--tw-ring-color': 'var(--upup-color-border-active)' } as React.CSSProperties
                                        : {}),
                                }}
                                data-upup-file-id={file.id}
                            >
                                <div
                                    className="upup-text-sm upup-truncate"
                                    style={{ color: 'var(--upup-color-text)' }}
                                >
                                    {file.name}
                                </div>
                            </div>
                        )
                    })}
                </div>
            </motion.div>

            {/* Footer */}
            <div
                className="upup-shadow-top upup-flex upup-items-center upup-gap-3 upup-rounded-b-lg upup-px-3 upup-py-2"
                style={{ backgroundColor: 'var(--upup-color-surface-alt)' }}
                data-upup-slot="fileList.footer"
            >
                {!isSuccessful && !isFailed && (
                    <button
                        className="upup-disabled:animate-pulse upup-ml-auto upup-rounded-full upup-px-4 upup-py-2 upup-text-sm upup-font-medium upup-text-white"
                        style={{ backgroundColor: 'var(--upup-color-primary)' }}
                        onClick={() => upload()}
                        disabled={isUploading || isPaused}
                        data-upup-slot="fileList.uploadButton"
                    >
                        {t('fileList.uploadFiles', { count: files.length })}
                    </button>
                )}
                {isFailed && (
                    <button
                        className="upup-disabled:animate-pulse upup-ml-auto upup-rounded-full upup-px-4 upup-py-2 upup-text-sm upup-font-medium upup-text-white"
                        style={{ backgroundColor: 'var(--upup-color-danger)' }}
                        onClick={() => upload()}
                        data-upup-slot="fileList.uploadButton"
                    >
                        {t('fileList.uploadFiles', { count: files.length })}
                    </button>
                )}
                {isSuccessful && (
                    <button
                        className="upup-disabled:animate-pulse upup-ml-auto upup-rounded-lg upup-px-3 upup-py-2 upup-text-sm upup-font-medium upup-text-white"
                        style={{ backgroundColor: 'var(--upup-color-primary)' }}
                        onClick={cancel}
                        data-upup-slot="fileList.doneButton"
                    >
                        {t('common.done')}
                    </button>
                )}
                <div className="upup-flex upup-flex-1 upup-flex-col upup-gap-1">
                    <div className="upup-flex upup-items-center upup-gap-2">
                        {(isUploading || isPaused) && (
                            <button
                                className="upup-flex upup-h-7 upup-w-7 upup-items-center upup-justify-center upup-rounded-full upup-transition-colors"
                                style={{
                                    backgroundColor: 'var(--upup-color-surface-alt)',
                                    color: 'var(--upup-color-text)',
                                }}
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
                        />
                    </div>
                </div>
            </div>
        </div>
    )
})
