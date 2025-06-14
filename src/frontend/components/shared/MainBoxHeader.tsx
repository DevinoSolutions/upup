import React, { useMemo } from 'react'
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
        () => (isAddingMore ? 'Cancel' : 'Remove all files'),
        [isAddingMore],
    )

    if (mini) return null

    return (
        <div
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
                <ShouldRender if={isAddingMore}>Adding more files</ShouldRender>
                <ShouldRender if={!isAddingMore}>
                    {files.size} file{files.size > 1 ? 's' : ''} selected
                </ShouldRender>
            </span>
            <ShouldRender if={!isAddingMore && limit > 1 && !isLimitReached}>
                <button
                    className={cn(
                        'upup-col-start-3 upup-col-end-5 upup-flex upup-items-center upup-justify-end upup-gap-1 upup-p-1 upup-text-sm upup-text-blue-600 md:upup-col-start-4',
                        {
                            'upup-text-[#30C5F7] dark:upup-text-[#30C5F7]':
                                dark,
                        },
                        classNames.containerAddMoreButton,
                    )}
                    onClick={() => setIsAddingMore(true)}
                    disabled={isUploading || isProcessing}
                >
                    <ContainerAddMoreIcon /> Add More
                </button>
            </ShouldRender>
        </div>
    )
}
