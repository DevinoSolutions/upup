import React, { MouseEventHandler, memo, useCallback, useState } from 'react'
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
    const [canPreview, setCanPreview] = useState(false)

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
                'upup-relative upup-flex upup-flex-1 upup-gap-2 upup-rounded upup-border upup-border-[#6D6D6D] upup-bg-white md:upup-static md:upup-basis-32 md:upup-rounded-none md:upup-border-none md:upup-bg-transparent',
                {
                    'md:upup-flex-col': files.size > 1,
                    'upup-flex-col': files.size === 1,
                    'upup-bg-[#1F1F1F] dark:upup-bg-[#1F1F1F] md:upup-bg-transparent md:dark:upup-bg-transparent':
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
                canPreview={canPreview}
                setCanPreview={setCanPreview}
                onClick={() => onFileClick(file)}
            />
            <div
                className={cn(
                    'upup-flex upup-flex-col upup-items-start upup-justify-between upup-p-2 upup-pt-0 md:upup-p-0',
                    classNames.fileInfo,
                )}
            >
                <p
                    className={cn(
                        'upup-max-w-full upup-flex-1 upup-truncate upup-text-xs upup-text-[#0B0B0B]',
                        {
                            'upup-text-white dark:upup-text-white': dark,
                        },
                        classNames.fileName,
                    )}
                >
                    {file.name}
                </p>
                <p
                    className={cn(
                        'upup-text-xs upup-text-[#6D6D6D]',
                        classNames.fileSize,
                    )}
                >
                    {bytesToSize(file.size)}
                </p>
                <ShouldRender if={canPreview}>
                    <button
                        className={cn(
                            'upup-text-xs upup-text-blue-600',
                            {
                                'upup-text-[#59D1F9] dark:upup-text-[#59D1F9]':
                                    dark,
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
                            fileUrl={file.url}
                            fileName={file.name}
                        />
                    </ShouldRender>
                </ShouldRender>
            </div>
        </div>
    )
})
