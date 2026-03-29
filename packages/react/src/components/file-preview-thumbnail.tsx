'use client'

import React, { Dispatch, SetStateAction, memo, useMemo } from 'react'
import type { UploaderClassNames } from '@upup/shared'
import {
    fileCanPreviewText,
    fileGetExtension,
    fileGetIsText,
    fileGetIsVideo,
    fileIs3D,
} from '../lib/file'
import { cn } from '../lib/tailwind'

// Minimal inline FileIcon — renders extension label as a fallback
function FileIcon({
    extension,
    className,
}: {
    extension: string | null
    className?: string
}) {
    return (
        <div
            className={cn(
                'upup-flex upup-h-12 upup-w-10 upup-flex-col upup-items-center upup-justify-center upup-rounded upup-border upup-border-gray-300 upup-bg-gray-100 upup-text-[9px] upup-font-bold upup-uppercase upup-text-gray-500',
                className,
            )}
        >
            {extension ?? 'file'}
        </div>
    )
}

type Props = {
    canPreview: boolean
    setCanPreview: Dispatch<SetStateAction<boolean>>
    fileType: string
    fileName: string
    fileUrl: string
    fileSize?: number
    classNames: UploaderClassNames
    allowPreview: boolean
    loadingLabel?: string
}

export default memo(
    function FilePreviewThumbnail({
        canPreview,
        setCanPreview,
        fileUrl,
        fileName,
        fileType,
        fileSize,
        classNames,
        allowPreview,
        loadingLabel = 'Loading…',
    }: Props) {
        const extension = useMemo(
            () => fileGetExtension(fileType, fileName),
            [fileType, fileName],
        )

        const is3D = useMemo(
            () => fileIs3D(extension?.toLowerCase() || ''),
            [extension],
        )
        const isVideo = useMemo(() => fileGetIsVideo(fileType), [fileType])

        const isOversizedText = useMemo(() => {
            const isText = fileGetIsText(fileType, fileName)
            return isText && !fileCanPreviewText(fileType, fileName, fileSize)
        }, [fileType, fileName, fileSize])

        if (is3D || isOversizedText) {
            return (
                <div className="upup-flex upup-flex-col upup-items-center upup-gap-2">
                    <FileIcon
                        extension={extension}
                        className={classNames.fileIcon}
                    />
                </div>
            )
        }

        return (
            <>
                {!canPreview && (
                    <>
                        {isVideo ? (
                            <video
                                src={fileUrl}
                                preload="metadata"
                                muted
                                playsInline
                                className="upup-hidden"
                                onLoadedData={() => setCanPreview(true)}
                            />
                        ) : (
                            <object
                                data={fileUrl}
                                width="0%"
                                height="0%"
                                name={fileName}
                                type={fileType}
                                onLoad={() => setCanPreview(true)}
                            >
                                <p>{loadingLabel}</p>
                            </object>
                        )}
                        <FileIcon extension={extension} />
                    </>
                )}

                {canPreview && (
                    <>
                        <FileIcon
                            extension={extension}
                            className={cn(
                                { 'md:upup-hidden': allowPreview },
                                classNames.fileIcon,
                            )}
                        />
                        <div
                            className={cn(
                                `upup-relative upup-hidden upup-h-full upup-w-full ${
                                    allowPreview && 'md:upup-block'
                                }`,
                            )}
                        >
                            {isVideo ? (
                                <video
                                    src={fileUrl}
                                    preload="metadata"
                                    muted
                                    playsInline
                                    className="upup-absolute upup-h-full upup-w-full upup-object-cover"
                                />
                            ) : (
                                <object
                                    data={fileUrl}
                                    width="100%"
                                    height="100%"
                                    name={fileName}
                                    type={fileType}
                                    className="upup-absolute upup-h-full upup-w-full"
                                >
                                    <p>{loadingLabel}</p>
                                </object>
                            )}
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
