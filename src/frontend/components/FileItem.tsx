import React, { MouseEventHandler, memo, useCallback, useState } from 'react'
import truncate from 'truncate'
import { FileWithParams } from '../../shared/types'
import { useRootContext } from '../context/RootContext'
import { bytesToSize } from '../lib/file'
import { cn } from '../lib/tailwind'
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
    const [previewIsUnsupported, setPreviewIsUnsupported] = useState(false)

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
                '@cs/main:static @cs/main:rounded-none @cs/main:border-none @cs/main:bg-transparent @cs/main:basis-32 relative flex flex-1 gap-2 rounded border border-[#6D6D6D] bg-white',
                {
                    '@cs/main:flex-col': files.size > 1,
                    'flex-col': files.size === 1,
                    '@cs/main:bg-transparent @cs/main:dark:bg-transparent bg-[#1F1F1F] dark:bg-[#1F1F1F]':
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
                previewIsUnsupported={previewIsUnsupported}
                setPreviewIsUnsupported={setPreviewIsUnsupported}
                onClick={() => onFileClick(file)}
            />
            <div
                className={cn(
                    '@cs/main:p-0 flex flex-col items-start justify-between p-2 pt-0',
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
                <ShouldRender if={!previewIsUnsupported}>
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
                        />
                    </ShouldRender>
                </ShouldRender>
            </div>
        </div>
    )
})
