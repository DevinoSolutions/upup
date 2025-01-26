import React from 'react'
import { UploadStatus, useRootContext } from '../../context/RootContext'
import { cn } from '../../lib/tailwind'
import ShouldRender from './ShouldRender'

type Props = {
    handleCancel(): void
}

export default function MainBoxHeader({ handleCancel }: Props) {
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

    if (mini) return null

    return (
        <div
            className={cn(
                'absolute left-0 right-0 top-0 z-10 grid grid-cols-4 items-center justify-between rounded-t-lg bg-black/[0.025] px-3 py-2 max-md:grid-rows-2',
                {
                    'bg-white/5 dark:bg-white/5': dark,
                },
                classNames.containerHeader,
            )}
        >
            <button
                className={cn(
                    'max-md p-1 text-left text-sm text-blue-600 max-md:col-start-1 max-md:col-end-3 max-md:row-start-2',
                    {
                        'text-[#30C5F7] dark:text-[#30C5F7]': dark,
                    },
                    classNames.containerCancelButton,
                )}
                onClick={handleCancel}
                disabled={isUploading}
            >
                Cancel
            </button>
            <span
                className={
                    'text-center text-sm text-[#6D6D6D] max-md:col-span-4 md:col-span-2'
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
                        'flex items-center justify-end gap-1 p-1 text-sm text-blue-600 max-md:col-start-3 max-md:col-end-5',
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
