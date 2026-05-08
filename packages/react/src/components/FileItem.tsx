'use client'
import React, { MouseEventHandler, memo, useCallback, useState } from 'react'
import type { UploadFile } from '@upup/core'
import { useRootContext } from '../context/RootContext'
import { cn } from '../lib/tailwind'
import FilePreview from './FilePreview'
import FilePreviewPortal from './FilePreviewPortal'

type Props = {
    file: UploadFile
}

export default memo(function FileItem({ file }: Props) {
    const {
        core,
        files,
        props: { slotClasses, onFileClick },
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
        // v2: emit file-preview-open via UpupCore
        core?.emit('file-preview-open', { fileId: file.id, fileName: file.name })
    }, [core, file.id, file.name])
    const closePreviewPortal = useCallback(() => {
        setShowPreviewPortal(false)
        // v2: emit file-preview-close via UpupCore
        core?.emit('file-preview-close', { fileId: file.id, fileName: file.name })
    }, [core, file.id, file.name])

    return (
        <div
            data-testid="upup-file-item"
            data-upup-slot="file-item"
            className={cn(
                'upup-relative upup-flex upup-flex-1 upup-flex-col upup-items-start upup-gap-1 upup-bg-transparent',
                {
                    [slotClasses.fileItemMultiple!]:
                        slotClasses.fileItemMultiple && files.size > 1,
                    [slotClasses.fileItemSingle!]:
                        slotClasses.fileItemSingle && files.size === 1,
                },
            )}
        >
            <FilePreview
                fileName={file.name}
                fileType={file.type ?? ''}
                fileId={file.id}
                fileUrl={file.url ?? ''}
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
                    onClose={closePreviewPortal}
                    fileType={file.type ?? ''}
                    fileUrl={file.url ?? ''}
                    fileName={file.name}
                    fileSize={file.size}
                />
            )}
        </div>
    )
})
