import React, { Dispatch, SetStateAction, memo, useMemo } from 'react'
import FileViewer from 'react-file-viewer'
import { fileGetExtension } from '../lib/file'
import { cn } from '../lib/tailwind'
import FileIcon from './FileIcon'
import FilePreviewUnsupported from './FilePreviewUnsupported'
import ShouldRender from './shared/ShouldRender'

type Props = {
    previewIsUnsupported: boolean
    setPreviewIsUnsupported: Dispatch<SetStateAction<boolean>>
    fileType: string
    fileName: string
    fileUrl: string
    fileId: string
    showIcon: boolean
}

export default memo(
    function FilePreviewThumbnail({
        previewIsUnsupported,
        setPreviewIsUnsupported,
        fileUrl,
        fileName,
        fileType,
        fileId,
        showIcon,
    }: Props) {
        const extension = useMemo(
            () => fileGetExtension(fileType, fileName),
            [fileType, fileName],
        )

        return (
            <>
                <ShouldRender if={previewIsUnsupported}>
                    <FileIcon extension={extension} />
                </ShouldRender>
                <ShouldRender if={!previewIsUnsupported}>
                    <FileIcon
                        extension={extension}
                        className={cn('md:hidden', {
                            hidden: !showIcon,
                        })}
                    />
                    <div
                        className={cn('relative h-full w-full ', {
                            'max-md:hidden': showIcon,
                        })}
                    >
                        <div className="absolute inset-0">
                            <FileViewer
                                key={fileId}
                                fileType={extension}
                                filePath={fileUrl}
                                errorComponent={() => (
                                    <FilePreviewUnsupported
                                        onPreviewIsUnsupported={
                                            setPreviewIsUnsupported
                                        }
                                        previewIsUnsupported
                                    />
                                )}
                                unsupportedComponent={() => (
                                    <FilePreviewUnsupported
                                        onPreviewIsUnsupported={
                                            setPreviewIsUnsupported
                                        }
                                        previewIsUnsupported
                                    />
                                )}
                            />
                        </div>
                    </div>
                </ShouldRender>
            </>
        )
    },
    // Custom comparison function for props
    (prev, next) =>
        prev.previewIsUnsupported === next.previewIsUnsupported &&
        prev.fileType === next.fileType &&
        prev.fileUrl === next.fileUrl &&
        prev.showIcon === next.showIcon,
)
