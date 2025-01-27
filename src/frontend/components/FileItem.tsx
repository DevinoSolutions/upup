import React, { MouseEventHandler, memo, useCallback, useState } from 'react'
import truncate from 'truncate'
import { FileWithParams } from '../../shared/types'
import { useRootContext } from '../context/RootContext'
import { bytesToSize } from '../lib/file'
import { cn } from '../lib/tailwind'
import { FilePreviewStatus } from '../types/file'
import FilePreview from './FilePreview'
import FilePreviewPortal from './FilePreviewPortal'
import ShouldRender from './shared/ShouldRender'

type Props = {
    file: FileWithParams
}

export default memo(function FileItem({ file }: Props) {
    const {
        files,
        props: { dark, classNames, onFileClick },
    } = useRootContext()
    const [showPreviewPortal, setShowPreviewPortal] = useState(false)
    const [previewStatus, setPreviewStatus] = useState(
        FilePreviewStatus.SupportedByFileViewer,
    )

    const handleStopPropagation: MouseEventHandler<HTMLElement> = useCallback(
        e => {
            e.stopPropagation()
        },
        [],
    )
    const handleShowPreviewPortal: MouseEventHandler<HTMLSpanElement> =
        useCallback(
            e => {
                handleStopPropagation(e)
                setShowPreviewPortal(true)
            },
            [handleStopPropagation],
        )

    return (
        <div
            className={cn(
                'relative flex flex-1 gap-2 rounded border border-[#6D6D6D] bg-white @cs/main:static @cs/main:basis-32 @cs/main:rounded-none @cs/main:border-none @cs/main:bg-transparent',
                {
                    '@cs/main:flex-col': files.size > 1,
                    'flex-col': files.size === 1,
                    'bg-[#1F1F1F] @cs/main:bg-transparent dark:bg-[#1F1F1F] @cs/main:dark:bg-transparent':
                        dark,
                    [classNames.fileItemMultiple!]:
                        classNames.fileItemMultiple && files.size > 1,
                    [classNames.fileItemSingle!]:
                        classNames.fileItemSingle && files.size === 1,
                },
            )}
        >
            <FilePreview
                fileName={file.name}
                fileType={file.type}
                fileId={file.id}
                fileUrl={file.url}
                previewStatus={previewStatus}
                setPreviewStatus={setPreviewStatus}
                onClick={() => onFileClick(file)}
            />
            <div
                className={cn(
                    'flex flex-col items-start justify-between p-2 pt-0 @cs/main:p-0',
                    classNames.fileInfo,
                )}
            >
                <p
                    className={cn(
                        'flex-1 text-xs text-[#0B0B0B]',
                        {
                            'text-white dark:text-white': dark,
                        },
                        classNames.fileName,
                    )}
                >
                    {truncate(file.name, 20)}
                </p>
                <p
                    className={cn(
                        'text-xs text-[#6D6D6D]',
                        classNames.fileSize,
                    )}
                >
                    {bytesToSize(file.size)}
                </p>
                <ShouldRender
                    if={previewStatus !== FilePreviewStatus.Unsupported}
                >
                    <button
                        className={cn(
                            'text-xs text-blue-600',
                            {
                                'text-[#59D1F9] dark:text-[#59D1F9]': dark,
                            },
                            classNames.filePreviewButton,
                        )}
                        onClick={handleShowPreviewPortal}
                    >
                        Click to preview
                    </button>
                    <ShouldRender if={showPreviewPortal}>
                        <FilePreviewPortal
                            onStopPropagation={handleStopPropagation}
                            onClick={() => setShowPreviewPortal(false)}
                            fileType={file.type}
                            fileId={file.id}
                            fileUrl={file.url}
                            fileName={file.name}
                            previewStatus={previewStatus}
                        />
                    </ShouldRender>
                </ShouldRender>
            </div>
        </div>
    )
})
