import React, { MouseEventHandler, memo, useCallback, useState } from 'react'
import { FileWithParams } from '../../shared/types'
import { useRootContext } from '../context/RootContext'
import { cn } from '../lib/tailwind'
import FilePreview from './FilePreview'
import FilePreviewPortal from './FilePreviewPortal'

type Props = {
    file: FileWithParams
}

export default memo(function FileItem({ file }: Props) {
    const {
        files,
        props: { classNames, onFileClick },
    } = useRootContext()
    const [showPreviewPortal, setShowPreviewPortal] = useState(false)
    const [canPreview, setCanPreview] = useState(false)

    const handleStopPropagation: MouseEventHandler<HTMLElement> = useCallback(
        e => {
            e.stopPropagation()
        },
        [],
    )
    const openPreviewPortal = useCallback(() => {
        setShowPreviewPortal(true)
    }, [])

    return (
        <div
            data-testid="upup-file-item"
            className={cn(
                'upup-relative upup-flex upup-flex-1 upup-flex-col upup-items-start upup-gap-1 upup-bg-transparent',
                {
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
                fileSize={file.size}
                canPreview={canPreview}
                setCanPreview={setCanPreview}
                onRequestPreview={openPreviewPortal}
                onClick={() => onFileClick(file)}
            />
            {/* Keep preview portal mounted without showing duplicate info */}
            {canPreview && showPreviewPortal && (
                <FilePreviewPortal
                    onStopPropagation={handleStopPropagation}
                    onClick={() => setShowPreviewPortal(false)}
                    fileType={file.type}
                    fileUrl={file.url}
                    fileName={file.name}
                />
            )}
        </div>
    )
})
