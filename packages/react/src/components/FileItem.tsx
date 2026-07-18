import React, { MouseEventHandler, memo, useCallback, useState } from 'react'
import { cn } from '@upupjs/core/internal'
import type { UploadFile } from '@upupjs/core'
import {
    useUploaderFiles,
    useUploaderOptions,
    useUploaderRuntime,
    useUploaderTheme,
    useUploaderView,
} from '../context/UploaderContext'
import FilePreview from './FilePreview'
import FilePreviewPortal from './FilePreviewPortal'
import FileRow from './FileRow'

type Props = {
    file: UploadFile
    /** Position in the sorted list — drives the entrance stagger. */
    index?: number
    /** True when the panel forces the row list (tiles don't fit one row). */
    forcedList?: boolean
}

export default memo(function FileItem({
    file,
    index = 0,
    forcedList = false,
}: Props) {
    const { core } = useUploaderRuntime()
    const { files, leavingFileIds } = useUploaderFiles()
    const { viewMode } = useUploaderView()
    const { onFileClick } = useUploaderOptions()
    const { slotOverrides: slotClasses } = useUploaderTheme()
    const [showPreviewPortal, setShowPreviewPortal] = useState(false)
    const [canPreview, setCanPreview] = useState(false)

    const leaving = leavingFileIds.has(file.id)

    const handleStopPropagation: MouseEventHandler<HTMLElement> = useCallback(
        e => {
            e.stopPropagation()
        },
        [],
    )
    const openPreviewPortal = useCallback(() => {
        setShowPreviewPortal(true)
        core?.emit('file-preview-open', {
            fileId: file.id,
            fileName: file.name,
        })
    }, [core, file.id, file.name])
    const closePreviewPortal = useCallback(() => {
        setShowPreviewPortal(false)
        core?.emit('file-preview-close', {
            fileId: file.id,
            fileName: file.name,
        })
    }, [core, file.id, file.name])

    return (
        <div
            data-testid="upup-file-item"
            data-upup-slot="file-item"
            role="listitem"
            // Entrance/exit fx: `upup-animate-fx-enter` plays on mount (staggered
            // via animation-delay); a leaving id (deferred-removal window) swaps
            // in the collapse. The central CSS motion gate makes both inert under
            // data-motion='off' — render them unconditionally.
            className={cn(
                'upup-animate-fx-enter',
                'upup-relative upup-flex upup-flex-1 upup-flex-col upup-items-start upup-gap-1 upup-bg-transparent',
                leaving && 'upup-animate-fx-exit upup-overflow-hidden',
                {
                    [slotClasses.fileItemMultiple ?? '']:
                        slotClasses.fileItemMultiple && files.size > 1,
                    [slotClasses.fileItemSingle ?? '']:
                        slotClasses.fileItemSingle && files.size === 1,
                },
            )}
            // Cap the stagger: in the virtualized branch `index` is unbounded,
            // so a late row would otherwise wait index*40ms (index 30 = 1200ms).
            style={
                leaving
                    ? undefined
                    : { animationDelay: `${Math.min(index, 8) * 40}ms` }
            }
        >
            {viewMode === 'list' || forcedList ? (
                <FileRow file={file} index={index} />
            ) : (
                <>
                    <FilePreview
                        fileName={file.name}
                        fileType={file.type ?? ''}
                        fileId={file.id}
                        fileUrl={file.url ?? ''}
                        fileSize={file.size}
                        index={index}
                        canPreview={canPreview}
                        setCanPreview={setCanPreview}
                        onRequestPreview={openPreviewPortal}
                        onClick={() => {
                            onFileClick(file)
                        }}
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
                </>
            )}
        </div>
    )
})
