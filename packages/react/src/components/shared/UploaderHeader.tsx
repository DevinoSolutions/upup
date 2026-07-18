import React from 'react'
import Icon from '../Icon'
import { formatUiMessage as t, pluralUiMessage as plural } from '@upupjs/core'
import { cn, isUploadActive } from '@upupjs/core/internal'
import {
    useUploaderFiles,
    useUploaderI18n,
    useUploaderOptions,
    useUploaderTheme,
    useUploaderUploadControls,
    useUploaderView,
} from '../../context/UploaderContext'
import { isListViewForced } from '../../lib/view-mode'

type Props = {
    handleCancel(): void
}

export default function UploaderHeader({
    handleCancel,
}: Readonly<Props>): React.ReactElement | null {
    const { files } = useUploaderFiles()
    const { viewMode, setViewMode, openSourceOverlay } = useUploaderView()
    const { translations: tr } = useUploaderI18n()
    const {
        mini,
        limit,
        isProcessing,
        icons: { ContainerAddMoreIcon },
    } = useUploaderOptions()
    const { isDark: dark, slotOverrides: slotClasses } = useUploaderTheme()
    const {
        upload: { uploadStatus },
    } = useUploaderUploadControls()
    const isUploading = isUploadActive(uploadStatus)
    const isLimitReached = limit === files.size

    if (mini) return null

    return (
        <div
            data-testid="upup-header"
            data-upup-slot="header"
            className={cn(
                'upup-shadow-bottom upup-left-0 upup-right-0 upup-top-0 upup-z-10 upup-grid upup-grid-cols-4 upup-grid-rows-2 upup-items-center upup-justify-between upup-rounded-t-lg upup-bg-black/[0.025] upup-px-3 upup-py-2 md:upup-grid-rows-1',
                {
                    'upup-bg-white/5 dark:upup-bg-white/5': dark,
                },
                slotClasses.containerHeader,
            )}
        >
            <button
                className={cn(
                    'upup-max-md upup-col-start-1 upup-col-end-3 upup-row-start-2 upup-p-1 upup-text-left upup-text-sm upup-text-[#0284c7] md:upup-col-end-2 md:upup-row-start-1',
                    {
                        'upup-text-[#38bdf8] dark:upup-text-[#38bdf8]': dark,
                    },
                    slotClasses.containerCancelButton,
                )}
                onClick={handleCancel}
                disabled={isUploading || isProcessing}
            >
                {tr.removeAllFiles}
            </button>
            <span
                className={cn(
                    'upup-col-span-4 upup-text-center upup-text-sm upup-text-[#6D6D6D] md:upup-col-span-2',
                    {
                        'upup-text-gray-300 dark:upup-text-gray-300': dark,
                    },
                )}
            >
                {t(plural(tr, 'filesSelected', files.size), {
                    count: files.size,
                })}
            </span>
            <div className="upup-col-start-3 upup-col-end-5 upup-flex upup-items-center upup-justify-end upup-gap-2 md:upup-col-start-4">
                {/* Toggle hides once the row list is forced (too many files for
                    the tile grid to fit the fixed-height panel). */}
                {files.size > 1 && !isListViewForced(files.size) && (
                    <button
                        className={cn(
                            'upup-flex upup-h-7 upup-w-7 upup-items-center upup-justify-center upup-rounded upup-text-gray-500 upup-transition-colors hover:upup-bg-black/10',
                            {
                                'upup-text-gray-300 hover:upup-bg-white/10':
                                    dark,
                            },
                        )}
                        onClick={() => {
                            setViewMode(v => (v === 'grid' ? 'list' : 'grid'))
                        }}
                        title={
                            viewMode === 'grid'
                                ? tr.switchToListView
                                : tr.switchToGridView
                        }
                    >
                        {viewMode === 'grid' ? (
                            <Icon name="layout-list" size={16} />
                        ) : (
                            <Icon name="layout-grid" size={16} />
                        )}
                    </button>
                )}
                {limit > 1 && !isLimitReached && (
                    <button
                        data-testid="upup-add-more"
                        data-placement="header"
                        data-upup-slot="add-more"
                        className={cn(
                            'upup-fx-hover-lift upup-fx-press upup-flex upup-items-center upup-gap-1 upup-rounded-md upup-border upup-border-dashed upup-border-[#38bdf8]/50 upup-px-2 upup-py-1 upup-text-sm upup-text-[#0284c7]',
                            {
                                'upup-text-[#38bdf8] dark:upup-text-[#38bdf8]':
                                    dark,
                            },
                            slotClasses.containerAddMoreButton,
                        )}
                        onClick={() => {
                            openSourceOverlay()
                        }}
                        disabled={isUploading || isProcessing}
                    >
                        <ContainerAddMoreIcon /> {tr.addMore}
                    </button>
                )}
            </div>
        </div>
    )
}
