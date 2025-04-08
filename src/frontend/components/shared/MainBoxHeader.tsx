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
                'shadow-bottom absolute left-0 right-0 top-0 z-10 grid grid-cols-4 grid-rows-2 items-center justify-between rounded-t-lg bg-black/[0.025] px-3 py-2 @cs/main:grid-rows-1',
                {
                    'bg-white/5 dark:bg-white/5': dark,
                },
                classNames.containerHeader,
            )}
        >
            <button
                className={cn(
                    'max-md col-start-1 col-end-3 row-start-2 p-1 text-left text-sm text-blue-600 @cs/main:col-end-2 @cs/main:row-start-1',
                    {
                        'text-[#30C5F7] dark:text-[#30C5F7]': dark,
                    },
                    classNames.containerCancelButton,
                )}
                onClick={handleCancel}
                disabled={isUploading}
            >
                {cancelText}
            </button>
            <span
                className={
                    'col-span-4 text-center text-sm text-[#6D6D6D] @cs/main:col-span-2'
                }
            >
                <ShouldRender if={isAddingMore}>Adding more files</ShouldRender>
                <ShouldRender if={!isAddingMore}>
                    {files.size} file{files.size > 1 ? 's' : ''} selected
                </ShouldRender>
            </span>
            <ShouldRender if={!isAddingMore && limit > 1 && !isLimitReached}>
                <button
                    className={cn(
                        'col-start-3 col-end-5 flex items-center justify-end gap-1 p-1 text-sm text-blue-600 @cs/main:col-start-4',
                        {
                            'text-[#30C5F7] dark:text-[#30C5F7]': dark,
                        },
                        classNames.containerAddMoreButton,
                    )}
                    onClick={() => setIsAddingMore(true)}
                    disabled={isUploading}
                >
                    <ContainerAddMoreIcon /> Add More
                </button>
            </ShouldRender>
        </div>
    )
}
