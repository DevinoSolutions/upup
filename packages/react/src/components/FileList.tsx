import { useVirtualizer } from '@tanstack/react-virtual'
import React, { memo, useRef } from 'react'
import Icon from './Icon'
import {
    cn,
    formatUiMessage as t,
    isUploadActive,
    pluralUiMessage as plural,
} from '@upup/core'
import { UploadStatus } from '@upup/core'
import {
    useUploaderFiles,
    useUploaderI18n,
    useUploaderOptions,
    useUploaderSource,
    useUploaderTheme,
    useUploaderUploadControls,
    useUploaderView,
} from '../context/UploaderContext'
import FileItem from './FileItem'
import UploaderHeader from './shared/UploaderHeader'
import ProgressBar from './shared/ProgressBar'

const VIRTUAL_SCROLL_THRESHOLD = 20
const ESTIMATED_ITEM_HEIGHT = 76 // px — approximate FileItem row height

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
    const { isAddingMore, viewMode } = useUploaderView()
    const { activeSource } = useUploaderSource()
    const { files } = useUploaderFiles()
    const { translations: tr } = useUploaderI18n()
    const {
        upload: {
            startUpload,
            retryUpload,
            uploadStatus,
            totalProgress,
            uploadSpeed,
            uploadEta,
            uploadedBytes,
            totalBytes,
        },
        handleDone,
        handleCancel,
        handlePause,
        handleResume,
    } = useUploaderUploadControls()
    const { isProcessing, resumable } = useUploaderOptions()
    const {
        isDark: dark,
        slotOverrides: slotClasses,
        slots: themeSlots,
    } = useUploaderTheme()

    const scrollRef = useRef<HTMLDivElement>(null)

    const sortedFiles = Array.from(files.values()).sort((a, b) => {
        const pa = a.relativePath || a.name
        const pb = b.relativePath || b.name
        return pa.localeCompare(pb) || a.name.localeCompare(b.name)
    })

    // Virtual scrolling only for list mode with many files
    const shouldVirtualize =
        sortedFiles.length >= VIRTUAL_SCROLL_THRESHOLD && viewMode !== 'grid'

    const virtualizer = useVirtualizer({
        count: sortedFiles.length,
        getScrollElement: () => scrollRef.current,
        estimateSize: () => ESTIMATED_ITEM_HEIGHT,
        overscan: 5,
        enabled: shouldVirtualize,
    })

    return (
        <div
            data-testid="upup-file-list"
            data-upup-slot="file-list"
            className={cn(
                'upup-relative upup-flex upup-h-full upup-flex-col upup-rounded-lg upup-shadow',
                {
                    'upup-hidden': isAddingMore || activeSource || !files.size,
                },
                themeSlots?.fileList?.root,
            )}
        >
            {/* Visually-hidden live region: announces the current selection count
                to screen readers via the existing header.filesSelected i18n key. */}
            <div role="status" aria-live="polite" className="upup-sr-only">
                {t(plural(tr, 'filesSelected', files.size), {
                    count: files.size,
                })}
            </div>

            <UploaderHeader handleCancel={handleCancel} />

            <div
                ref={scrollRef}
                className={cn(
                    'upup-preview-scroll upup-flex upup-flex-1 upup-flex-col upup-overflow-y-auto upup-bg-black/[0.075] upup-p-3',
                    { 'upup-bg-white/10 dark:upup-bg-white/10': dark },
                    slotClasses.fileListContainer,
                )}
            >
                {shouldVirtualize ? (
                    // Virtualized list: only renders visible FileItems
                    <div
                        role="list"
                        data-upup-slot="file-list-virtual"
                        style={{
                            height: virtualizer.getTotalSize(),
                            position: 'relative',
                        }}
                        className={cn(
                            isProcessing &&
                                'upup-pointer-events-none upup-opacity-75',
                            'upup-font-[Arial,Helvetica,sans-serif]',
                        )}
                    >
                        {virtualizer.getVirtualItems().map(virtualItem => (
                            <div
                                key={virtualItem.key}
                                data-index={virtualItem.index}
                                ref={virtualizer.measureElement}
                                style={{
                                    position: 'absolute',
                                    top: 0,
                                    left: 0,
                                    width: '100%',
                                    transform: `translateY(${virtualItem.start}px)`,
                                    paddingBottom: 12,
                                }}
                            >
                                <FileItem
                                    file={sortedFiles[virtualItem.index]}
                                />
                            </div>
                        ))}
                    </div>
                ) : (
                    // Standard rendering for small lists and grid mode
                    <div
                        role="list"
                        className={cn(
                            `${isProcessing && 'upup-pointer-events-none upup-opacity-75'} upup-flex upup-flex-col upup-gap-3 upup-font-[Arial,Helvetica,sans-serif]`,
                            {
                                'md:upup-grid md:upup-gap-y-6':
                                    files.size > 1 && viewMode === 'grid',
                                'md:upup-grid-cols-2':
                                    files.size > 1 && viewMode === 'grid',
                                'upup-flex-1': files.size === 1,
                                [slotClasses.fileListContainerInnerMultiple!]:
                                    slotClasses.fileListContainerInnerMultiple &&
                                    files.size > 1,
                                [slotClasses.fileListContainerInnerSingle!]:
                                    slotClasses.fileListContainerInnerSingle &&
                                    files.size === 1,
                            },
                        )}
                    >
                        {sortedFiles.map(file => (
                            <FileItem key={file.id} file={file} />
                        ))}
                    </div>
                )}
            </div>
            <div
                className={cn(
                    'upup-shadow-top upup-flex upup-items-center upup-gap-3 upup-rounded-b-lg upup-bg-black/[0.025] upup-px-3 upup-py-2',
                    {
                        'upup-bg-white/5 dark:upup-bg-white/5': dark,
                    },
                    slotClasses.fileListFooter,
                )}
            >
                {/* FIX: Hide upload button when status is SUCCESSFUL or FAILED */}
                {uploadStatus !== UploadStatus.SUCCESSFUL &&
                    uploadStatus !== UploadStatus.FAILED && (
                        <button
                            data-testid="upup-upload-btn"
                            className={cn(
                                'upup-disabled:animate-pulse upup-ml-auto upup-rounded-full upup-bg-blue-600 upup-px-4 upup-py-2 upup-text-sm upup-font-medium upup-text-white',
                                {
                                    'upup-bg-[#30C5F7] dark:upup-bg-[#30C5F7]':
                                        dark,
                                },
                                slotClasses.uploadButton,
                            )}
                            onClick={() => {
                                void startUpload().catch(() => undefined)
                            }}
                            disabled={
                                isUploadActive(uploadStatus) ||
                                uploadStatus === UploadStatus.PAUSED ||
                                isProcessing
                            }
                        >
                            {t(plural(tr, 'uploadFiles', files.size), {
                                count: files.size,
                            })}
                        </button>
                    )}
                {uploadStatus === UploadStatus.FAILED && (
                    <button
                        data-testid="upup-retry-btn"
                        className={cn(
                            'upup-disabled:animate-pulse upup-ml-auto upup-rounded-full upup-bg-red-600 upup-px-4 upup-py-2 upup-text-sm upup-font-medium upup-text-white',
                            {
                                'upup-bg-red-500 dark:upup-bg-red-500': dark,
                            },
                            slotClasses.uploadButton,
                        )}
                        onClick={() => {
                            void retryUpload().catch(() => undefined)
                        }}
                    >
                        {resumable?.protocol === 'multipart'
                            ? tr.resumeUpload
                            : tr.retryUpload}
                    </button>
                )}
                {uploadStatus === UploadStatus.SUCCESSFUL && (
                    <button
                        className={cn(
                            'upup-disabled:animate-pulse upup-ml-auto upup-rounded-lg upup-bg-blue-600 upup-px-3 upup-py-2 upup-text-sm upup-font-medium upup-text-white',
                            {
                                'upup-bg-[#30C5F7] dark:upup-bg-[#30C5F7]':
                                    dark,
                            },
                            slotClasses.uploadDoneButton,
                        )}
                        onClick={handleDone}
                    >
                        {tr.done}
                    </button>
                )}
                <div className="upup-flex upup-flex-1 upup-flex-col upup-gap-1">
                    <div className="upup-flex upup-items-center upup-gap-2">
                        {resumable?.protocol === 'multipart' &&
                            (isUploadActive(uploadStatus) ||
                                uploadStatus === UploadStatus.PAUSED) && (
                                <>
                                    <button
                                        data-testid="upup-upload-pause-toggle"
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
                                        aria-label={
                                            uploadStatus === UploadStatus.PAUSED
                                                ? tr.resumeUpload
                                                : tr.pauseUpload
                                        }
                                        title={
                                            uploadStatus === UploadStatus.PAUSED
                                                ? tr.resumeUpload
                                                : tr.pauseUpload
                                        }
                                    >
                                        {uploadStatus ===
                                        UploadStatus.PAUSED ? (
                                            <Icon
                                                name="player-play"
                                                size={14}
                                            />
                                        ) : (
                                            <Icon
                                                name="player-pause"
                                                size={14}
                                            />
                                        )}
                                    </button>
                                    <button
                                        data-testid="upup-upload-cancel-btn"
                                        className={cn(
                                            'upup-flex upup-h-7 upup-w-7 upup-items-center upup-justify-center upup-rounded-full upup-bg-red-100 upup-text-red-700 upup-transition-colors hover:upup-bg-red-200',
                                            {
                                                'upup-bg-red-500/20 upup-text-red-100 hover:upup-bg-red-500/30':
                                                    dark,
                                            },
                                        )}
                                        onClick={handleCancel}
                                        aria-label={tr.cancel}
                                        title={tr.cancel}
                                    >
                                        <Icon name="x" size={14} />
                                    </button>
                                </>
                            )}
                        <ProgressBar
                            className="upup-flex-1"
                            progressBarClassName="upup-rounded"
                            progress={totalProgress}
                            showValue
                        />
                    </div>
                    {(isUploadActive(uploadStatus) ||
                        uploadStatus === UploadStatus.PAUSED) &&
                        totalBytes > 0 && (
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
                                {isUploadActive(uploadStatus) &&
                                    uploadEta > 0 && (
                                        <span>{formatEta(uploadEta)}</span>
                                    )}
                                {uploadStatus === UploadStatus.PAUSED && (
                                    <span>{tr.paused}</span>
                                )}
                            </div>
                        )}
                </div>
            </div>
        </div>
    )
})
