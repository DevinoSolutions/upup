import React, { Dispatch, SetStateAction, memo, useMemo } from 'react'
import type { InternalFlatClassNames } from '@upup/core'
import type { Translations } from '../shared/i18n/types'
import {
    fileCanPreviewText,
    fileGetExtension,
    fileGetIsPdf,
    fileGetIsText,
    fileIs3D,
} from '../lib/file'
import { cn } from '../lib/tailwind'
import FileIcon from './FileIcon'
import ShouldRender from './shared/ShouldRender'

type Props = {
    canPreview: boolean
    setCanPreview: Dispatch<SetStateAction<boolean>>
    fileType: string
    fileName: string
    fileUrl: string
    fileSize?: number
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
        fileSize,
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

        // Large text files (e.g. 3MB+ JSON) must not be rendered via <object> tags
        // as the browser will attempt to parse and lay out the entire content,
        // blocking the main thread and freezing the page.
        const isOversizedText = useMemo(() => {
            const isText = fileGetIsText(fileType, fileName)
            return isText && !fileCanPreviewText(fileType, fileName, fileSize)
        }, [fileType, fileName, fileSize])

        // PDFs, 3D files, and oversized text → static icon (no inline embedding)
        if (isPdf || is3D || isOversizedText) {
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
                <ShouldRender if={!canPreview}>
                    <object
                        data={fileUrl}
                        width="0%"
                        height="0%"
                        name={fileName}
                        type={fileType}
                        onLoad={() => setCanPreview(true)}
                    >
                        <p>{tr.loading}</p>
                    </object>
                    <FileIcon extension={extension} />
                </ShouldRender>

                <ShouldRender if={canPreview}>
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
                </ShouldRender>
            </>
        )
    },
    (prev, next) =>
        prev.canPreview === next.canPreview &&
        prev.fileType === next.fileType &&
        prev.fileUrl === next.fileUrl,
)
