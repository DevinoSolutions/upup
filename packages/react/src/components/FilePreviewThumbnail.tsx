import React, { Dispatch, SetStateAction, memo, useMemo } from 'react'
import { cn } from '@upup/core/internal'
import type { Translations } from '@upup/core'
import type { InternalFlatClassNames } from '@upup/core/internal'
import {
    fileGetExtension,
    fileGetIsPdf,
    fileGetIsText,
    fileIs3D,
} from '../lib/file'
import FileIcon from './FileIcon'

type Props = {
    canPreview: boolean
    setCanPreview: Dispatch<SetStateAction<boolean>>
    fileType: string
    fileName: string
    fileUrl: string
    fileSize?: number | undefined
    slotClasses: InternalFlatClassNames
    allowPreview: boolean
    labels: Translations
}

export default memo(
    function FilePreviewThumbnail({
        canPreview,
        setCanPreview,
        fileUrl,
        fileName,
        fileType,
        fileSize: _fileSize,
        slotClasses,
        allowPreview,
        labels: tr,
    }: Props) {
        const extension = useMemo(
            () => fileGetExtension(fileType, fileName),
            [fileType, fileName],
        )

        const is3D = useMemo(() => {
            return fileIs3D(extension?.toLowerCase() || '')
        }, [extension])

        const isPdf = useMemo(
            () => fileGetIsPdf(fileType, fileName),
            [fileType, fileName],
        )

        // Text files render as a static doc icon (cross-framework parity — all
        // adapters show the doc icon, not the inline text). The full content stays
        // available via the "click to preview" portal, and this also avoids laying
        // out huge text files inline (which froze the main thread).
        const isText = useMemo(
            () => fileGetIsText(fileType, fileName),
            [fileType, fileName],
        )

        // PDFs, 3D files, and text → static icon (no inline embedding)
        if (isPdf || is3D || isText) {
            return (
                <div className="upup-flex upup-flex-col upup-items-center upup-gap-2">
                    <FileIcon
                        extension={extension}
                        className={slotClasses.fileIcon}
                    />
                </div>
            )
        }

        return (
            <>
                {!canPreview && (
                    <>
                        <object
                            data={fileUrl}
                            width="0%"
                            height="0%"
                            name={fileName}
                            type={fileType}
                            onLoad={() => {
                                setCanPreview(true)
                            }}
                        >
                            <p>{tr.loading}</p>
                        </object>
                        <FileIcon extension={extension} />
                    </>
                )}

                {canPreview && (
                    <>
                        <FileIcon
                            extension={extension}
                            className={cn(
                                {
                                    'md:upup-hidden': allowPreview,
                                },
                                slotClasses.fileIcon,
                            )}
                        />
                        <div
                            className={cn(
                                `upup-relative upup-hidden upup-h-full upup-w-full ${
                                    allowPreview && 'md:upup-block'
                                }`,
                            )}
                        >
                            <object
                                data={fileUrl}
                                width="100%"
                                height="100%"
                                name={fileName}
                                type={fileType}
                                className="upup-absolute upup-h-full upup-w-full"
                            >
                                <p>{tr.loading}</p>
                            </object>
                        </div>
                    </>
                )}
            </>
        )
    },
    (prev, next) =>
        prev.canPreview === next.canPreview &&
        prev.fileType === next.fileType &&
        prev.fileUrl === next.fileUrl,
)
