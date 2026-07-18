import { useVirtualizer } from '@tanstack/react-virtual'
import React, { memo, useRef } from 'react'
import Icon from './Icon'
import { formatUiMessage as t, pluralUiMessage as plural } from '@upupjs/core'
import { cn, isUploadActive } from '@upupjs/core/internal'
import { UploadStatus } from '@upupjs/core'
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
import FileHero from './FileHero'
import UploaderHeader from './shared/UploaderHeader'
import ProgressBar from './shared/ProgressBar'
import FileSuccessCheck from './shared/FileSuccessCheck'
import { isListViewForced } from '../lib/view-mode'
import { useTilesPerRow } from '../lib/use-tiles-per-row'

const VIRTUAL_SCROLL_THRESHOLD = 20
const ESTIMATED_ITEM_HEIGHT = 76 // px — approximate FileItem row height

function formatBytes(bytes: number): string {
    if (bytes === 0) return '0 B'
    const k = 1024
    const sizes = ['B', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i] ?? ''}`
}

function formatEta(seconds: number): string {
    if (seconds <= 0 || !isFinite(seconds)) return ''
    const m = Math.floor(seconds / 60)
    const s = seconds % 60
    if (m > 0) return `${m}m ${s}s left`
    return `${s}s left`
}

export default memo(function FileList() {
    const { viewMode, sourceOverlayOpen, openSourceOverlay } = useUploaderView()
    const { activeSource } = useUploaderSource()
    const { files, leavingFileIds } = useUploaderFiles()
    const { translations: tr } = useUploaderI18n()
    const {
        upload: {
            startUpload,
            retryUpload,
            uploadStatus,
            uploadError,
            uploadErrorCode,
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
    const {
        isProcessing,
        resumable,
        limit,
        quietCompletion,
        icons: { ContainerAddMoreIcon },
    } = useUploaderOptions()
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

    const isSingle = sortedFiles.length === 1

    // Adaptive layout rule: the square-tile grid is only honored when every tile
    // fits in ONE row of the fixed-height panel. tilesPerRow is measured from the
    // scroll container (160px min tile + 16px gap); past it the row list is FORCED
    // and UploaderHeader hides the grid/list toggle.
    const tilesPerRow = useTilesPerRow(scrollRef)
    const forcedList = isListViewForced(sortedFiles.length, tilesPerRow)
    const effectiveViewMode = forcedList ? 'list' : viewMode

    // Virtual scrolling only for list mode with many files (never for the hero)
    const shouldVirtualize =
        sortedFiles.length >= VIRTUAL_SCROLL_THRESHOLD &&
        effectiveViewMode !== 'grid'

    const virtualizer = useVirtualizer({
        count: sortedFiles.length,
        getScrollElement: () => scrollRef.current,
        estimateSize: () => ESTIMATED_ITEM_HEIGHT,
        overscan: 5,
        enabled: shouldVirtualize,
    })

    const isUploading = isUploadActive(uploadStatus)
    // When the add-more source surface is up (overlay open, or a source chosen
    // while files exist), this list stays mounted but dimmed and inert behind it.
    const dimmed = sourceOverlayOpen || !!activeSource
    const heroLeaving = isSingle && leavingFileIds.has(sortedFiles[0]!.id)
    // Quiet completion (item 7): a successful run under `quietCompletion` shows
    // ONLY the checkmark overlay — Done/add-more/CTA are all suppressed and the
    // host takes over via the completion callbacks. Wins over 6a's continue flow.
    const quietDone =
        !!quietCompletion && uploadStatus === UploadStatus.SUCCESSFUL
    const canAddMore =
        limit > 1 &&
        files.size < limit &&
        !isUploading &&
        !isProcessing &&
        !quietDone

    return (
        <div
            data-testid="upup-file-list"
            data-upup-slot="file-list"
            // When the source overlay is up, the list is dimmed AND inert so
            // keyboard/screen-reader users can't reach the hidden remove/add-more
            // controls underneath (opacity+pointer-events alone don't block Tab/AT).
            inert={dimmed}
            className={cn(
                'upup-relative upup-flex upup-h-full upup-flex-col upup-rounded-lg upup-shadow',
                {
                    'upup-hidden': !files.size,
                    // Mock st2-listdim: the list stays clearly visible behind
                    // the add-more sheet — dimmed and softly blurred, not gone.
                    'upup-opacity-50 upup-blur-[2px] upup-pointer-events-none':
                        dimmed,
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

            <UploaderHeader
                handleCancel={handleCancel}
                forcedList={forcedList}
                hideAddMore={quietDone}
            />

            {/* Quiet-completion overlay (item 7): checkmark only, no CTAs. The fx
                classes on FileSuccessCheck die under data-motion='off' (it then
                simply appears drawn), so this satisfies the static-state rule. */}
            {quietDone && (
                <div
                    data-testid="upup-complete-check"
                    data-upup-slot="complete-check"
                    role="status"
                    className={cn(
                        'upup-absolute upup-inset-0 upup-z-20 upup-flex upup-flex-col upup-items-center upup-justify-center upup-gap-2 upup-rounded-lg upup-backdrop-blur-[1px]',
                        dark ? 'upup-bg-[#04080f]/40' : 'upup-bg-white/50',
                    )}
                >
                    <FileSuccessCheck size={56} />
                    <span
                        className={cn(
                            'upup-text-sm upup-font-medium',
                            dark
                                ? 'upup-text-[#e2e8f0]'
                                : 'upup-text-[#1e293b]',
                        )}
                    >
                        {tr.announceUploadComplete}
                    </span>
                </div>
            )}

            <div
                ref={scrollRef}
                className={cn(
                    'upup-preview-scroll upup-flex upup-flex-1 upup-flex-col upup-overflow-y-auto upup-p-3',
                    dark ? 'upup-bg-transparent' : 'upup-bg-black/[0.075]',
                    slotClasses.fileListContainer,
                )}
            >
                {isSingle ? (
                    // Single-file HERO: one visual fills the content area.
                    <div
                        role="list"
                        className={cn(
                            'upup-animate-fx-enter upup-flex upup-min-h-0 upup-flex-1 upup-flex-col',
                            heroLeaving &&
                                'upup-animate-fx-exit upup-overflow-hidden',
                        )}
                    >
                        <FileHero file={sortedFiles[0]!} />
                    </div>
                ) : shouldVirtualize ? (
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
                        {virtualizer.getVirtualItems().map(virtualItem => {
                            const file = sortedFiles[virtualItem.index]
                            if (!file) return null
                            return (
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
                                        file={file}
                                        index={virtualItem.index}
                                        forcedList={forcedList}
                                    />
                                </div>
                            )
                        })}
                    </div>
                ) : (
                    // Standard rendering for small lists and grid mode. Grid is a
                    // single row of auto-fit tiles that STRETCH to fill the row
                    // (minmax(160px,1fr) — no dead columns at 2/3 files). It is
                    // only reached when the tiles fit one row (else forcedList
                    // swaps to the list), so the grid can never wrap the fixed panel.
                    <div
                        role="list"
                        // Inline gridTemplateColumns (not a Tailwind arbitrary
                        // class): the comma/paren value doesn't survive the JIT
                        // scanner reliably, and this is the one place the tile
                        // count must be data-driven. auto-fit + minmax(160px,1fr)
                        // stretches tiles to fill the row with no dead columns.
                        style={
                            files.size > 1 && effectiveViewMode === 'grid'
                                ? {
                                      gridTemplateColumns:
                                          'repeat(auto-fit, minmax(160px, 1fr))',
                                  }
                                : undefined
                        }
                        className={cn(
                            isProcessing &&
                                'upup-pointer-events-none upup-opacity-75',
                            'upup-font-[Arial,Helvetica,sans-serif]',
                            files.size > 1 && effectiveViewMode === 'grid'
                                ? 'upup-grid upup-gap-4'
                                : 'upup-flex upup-flex-col upup-gap-3',
                            {
                                [slotClasses.fileListContainerInnerMultiple ??
                                '']:
                                    slotClasses.fileListContainerInnerMultiple &&
                                    files.size > 1,
                                [slotClasses.fileListContainerInnerSingle ??
                                '']:
                                    slotClasses.fileListContainerInnerSingle &&
                                    files.size === 1,
                            },
                        )}
                    >
                        {sortedFiles.map((file, index) => (
                            <FileItem
                                key={file.id}
                                file={file}
                                index={index}
                                forcedList={forcedList}
                            />
                        ))}
                    </div>
                )}

                {/* Full-width dashed "Add more" row (spec §4 state 3): a second
                    add-more affordance beneath the list/hero. Shares the
                    upup-add-more testid with the header control; disambiguated by
                    data-placement. Opens the add-more source overlay over this
                    dimmed list (core transient-UI store). */}
                {canAddMore && (
                    <button
                        data-testid="upup-add-more"
                        data-placement="footer"
                        data-upup-slot="add-more"
                        className={cn(
                            'upup-fx-hover-lift upup-fx-press upup-mt-2.5 upup-flex upup-flex-none upup-items-center upup-justify-center upup-gap-2 upup-whitespace-nowrap upup-rounded-xl upup-border-[1.5px] upup-border-dashed upup-px-3 upup-py-2 upup-text-[13px] upup-font-medium',
                            dark
                                ? 'upup-border-white/[0.16] upup-text-[#94a3b8]'
                                : 'upup-border-black/[0.16] upup-text-gray-500',
                            slotClasses.containerAddMoreButton,
                        )}
                        onClick={() => {
                            openSourceOverlay()
                        }}
                        disabled={isUploading || isProcessing}
                    >
                        <ContainerAddMoreIcon />
                        {tr.addMore}
                    </button>
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
                {/* Primary CTA only in a pre-run/idle state. Once a run is
                    active it becomes Cancel; when PAUSED it becomes Resume;
                    SUCCESSFUL shows Done and FAILED shows Retry (below). */}
                {uploadStatus !== UploadStatus.SUCCESSFUL &&
                    uploadStatus !== UploadStatus.FAILED &&
                    uploadStatus !== UploadStatus.PAUSED &&
                    !isUploading && (
                        <button
                            data-testid="upup-upload-btn"
                            className={cn(
                                'upup-fx-sheen-sweep upup-fx-press upup-disabled:animate-pulse upup-ml-auto upup-rounded-full upup-bg-[#0ea5e9] upup-px-4 upup-py-2 upup-text-sm upup-font-medium upup-text-white',
                                {
                                    'upup-bg-[#38bdf8] dark:upup-bg-[#38bdf8]':
                                        dark,
                                },
                                slotClasses.uploadButton,
                            )}
                            onClick={() => {
                                void startUpload().catch(() => undefined)
                            }}
                            disabled={
                                isUploadActive(uploadStatus) || isProcessing
                            }
                        >
                            {t(plural(tr, 'uploadFiles', files.size), {
                                count: files.size,
                            })}
                        </button>
                    )}
                {uploadStatus === UploadStatus.FAILED && uploadError && (
                    <p
                        data-testid="upup-upload-error"
                        data-upup-slot="upload-error"
                        title={uploadErrorCode}
                        className="upup-mr-auto upup-text-sm upup-text-red-600 dark:upup-text-red-400"
                    >
                        {uploadErrorCode
                            ? t(tr.uploadFailedWithCode, {
                                  code: uploadErrorCode,
                              })
                            : t(tr.uploadFailed, { message: uploadError })}
                    </p>
                )}
                {uploadStatus === UploadStatus.FAILED && (
                    <button
                        data-testid="upup-retry-btn"
                        className={cn(
                            'upup-fx-press upup-disabled:animate-pulse upup-ml-auto upup-rounded-full upup-bg-red-600 upup-px-4 upup-py-2 upup-text-sm upup-font-medium upup-text-white',
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
                {uploadStatus === UploadStatus.SUCCESSFUL &&
                    !quietCompletion && (
                        <button
                            className={cn(
                                'upup-fx-sheen-sweep upup-fx-press upup-disabled:animate-pulse upup-ml-auto upup-rounded-lg upup-bg-[#0ea5e9] upup-px-3 upup-py-2 upup-text-sm upup-font-medium upup-text-white',
                                {
                                    'upup-bg-[#38bdf8] dark:upup-bg-[#38bdf8]':
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
                        {/* Cancel an in-flight run: aborts the active request(s)
                            but KEEPS the files (status → PAUSED) so the run can be
                            resumed. A true discard is the header's "remove all".
                            Works for every protocol; multipart/tus resume partial
                            parts, others re-send the still-pending files. */}
                        {uploadStatus === UploadStatus.UPLOADING && (
                            <button
                                data-testid="upup-upload-cancel"
                                className={cn(
                                    'upup-fx-press upup-flex upup-h-7 upup-items-center upup-gap-1 upup-whitespace-nowrap upup-rounded-full upup-bg-red-100 upup-px-3 upup-text-xs upup-font-medium upup-text-red-700 upup-transition-colors hover:upup-bg-red-200',
                                    {
                                        'upup-bg-red-500/20 upup-text-red-100 hover:upup-bg-red-500/30':
                                            dark,
                                    },
                                )}
                                onClick={handlePause}
                                aria-label={tr.cancel}
                                title={tr.cancel}
                            >
                                <Icon name="x" size={14} />
                                {tr.cancel}
                            </button>
                        )}
                        {uploadStatus === UploadStatus.PAUSED && (
                            <button
                                data-testid="upup-upload-resume"
                                className={cn(
                                    'upup-fx-press upup-flex upup-h-7 upup-items-center upup-gap-1 upup-whitespace-nowrap upup-rounded-full upup-bg-[#0ea5e9] upup-px-3 upup-text-xs upup-font-medium upup-text-white upup-transition-colors',
                                    {
                                        'upup-bg-[#38bdf8] dark:upup-bg-[#38bdf8]':
                                            dark,
                                    },
                                )}
                                onClick={handleResume}
                                aria-label={tr.resumeUpload}
                                title={tr.resumeUpload}
                            >
                                <Icon name="player-play" size={14} />
                                {tr.resumeUpload}
                            </button>
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
