import React, { useMemo } from 'react'
import { TbLayoutGrid, TbLayoutList } from 'react-icons/tb'
import { plural, t } from '../../shared/i18n'
import { UploadStatus, useRootContext } from '../../context/RootContext'
import { cn } from '../../lib/tailwind'
import ShouldRender from './ShouldRender'

type Props = {
    handleCancel(): void
}

export default function MainBoxHeader({ handleCancel }: Readonly<Props>) {
    const {
        files,
        setIsAddingMore,
        isAddingMore,
        viewMode,
        setViewMode,
        translations: tr,
        props: {
            mini,
            limit,
            isProcessing,
            dark,
            classNames,
            icons: { ContainerAddMoreIcon },
        },
        upload: { uploadStatus },
    } = useRootContext()
    const isUploading = uploadStatus === UploadStatus.ONGOING
    const isLimitReached = limit === files.size
    const cancelText = useMemo(
        () => (isAddingMore ? tr.cancel : tr.removeAllFiles),
        [isAddingMore, tr],
    )

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
                classNames.containerHeader,
            )}
        >
            <button
                className={cn(
                    'upup-max-md upup-col-start-1 upup-col-end-3 upup-row-start-2 upup-p-1 upup-text-left upup-text-sm upup-text-blue-600 md:upup-col-end-2 md:upup-row-start-1',
                    {
                        'upup-text-[#30C5F7] dark:upup-text-[#30C5F7]': dark,
                    },
                    classNames.containerCancelButton,
                )}
                onClick={handleCancel}
                disabled={isUploading || isProcessing}
            >
                {cancelText}
            </button>
            <span
                className={cn(
                    'upup-col-span-4 upup-text-center upup-text-sm upup-text-[#6D6D6D] md:upup-col-span-2',
                    {
                        'upup-text-gray-300 dark:upup-text-gray-300': dark,
                    },
                )}
            >
                <ShouldRender if={isAddingMore}>
                    {tr.addingMoreFiles}
                </ShouldRender>
                <ShouldRender if={!isAddingMore}>
                    {t(plural(tr, 'filesSelected', files.size), {
                        count: files.size,
                    })}
                </ShouldRender>
            </span>
            <div className="upup-col-start-3 upup-col-end-5 upup-flex upup-items-center upup-justify-end upup-gap-2 md:upup-col-start-4">
                <ShouldRender if={files.size > 1}>
                    <button
                        className={cn(
                            'upup-flex upup-h-7 upup-w-7 upup-items-center upup-justify-center upup-rounded upup-text-gray-500 upup-transition-colors hover:upup-bg-black/10',
                            { 'upup-text-gray-300 hover:upup-bg-white/10': dark },
                        )}
                        onClick={() => setViewMode(v => v === 'grid' ? 'list' : 'grid')}
                        title={viewMode === 'grid' ? 'Switch to list view' : 'Switch to grid view'}
                    >
                        {viewMode === 'grid' ? <TbLayoutList size={16} /> : <TbLayoutGrid size={16} />}
                    </button>
                </ShouldRender>
                <ShouldRender if={!isAddingMore && limit > 1 && !isLimitReached}>
                    <button
                        className={cn(
                            'upup-flex upup-items-center upup-gap-1 upup-rounded-md upup-border upup-border-dashed upup-border-blue-400/50 upup-px-2 upup-py-1 upup-text-sm upup-text-blue-600',
                            {
                                'upup-text-[#30C5F7] dark:upup-text-[#30C5F7]':
                                    dark,
                            },
                            classNames.containerAddMoreButton,
                        )}
                        onClick={() => setIsAddingMore(true)}
                        disabled={isUploading || isProcessing}
                    >
                        <ContainerAddMoreIcon /> {tr.addMore}
                    </button>
                </ShouldRender>
            </div>
        </div>
    )
}
