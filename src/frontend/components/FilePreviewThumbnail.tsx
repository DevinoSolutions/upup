import React, { Dispatch, SetStateAction, memo, useMemo } from 'react'
import FileViewer from 'react-file-viewer'
import { fileGetExtension } from '../lib/file'
import { cn } from '../lib/tailwind'
import { FilePreviewStatus } from '../types/file'
import ErrorBoundary from './ErrorBoundary'
import FileIcon from './FileIcon'
import FileViewerUnsupported from './FileViewerUnsupported'
import ShouldRender from './shared/ShouldRender'

type Props = {
    previewStatus: FilePreviewStatus
    setPreviewStatus: Dispatch<SetStateAction<FilePreviewStatus>>
    fileType: string
    fileName: string
    fileUrl: string
    fileId: string
    showIcon: boolean
}

export default memo(
    function FilePreviewThumbnail({
        previewStatus,
        setPreviewStatus,
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
                <ShouldRender
                    if={previewStatus === FilePreviewStatus.Unsupported}
                >
                    <object
                        data={fileUrl}
                        width="0%"
                        height="0%"
                        name={fileName}
                        type={fileType}
                        onLoad={() =>
                            setPreviewStatus(
                                FilePreviewStatus.SupportedByHTMLObject,
                            )
                        }
                    />
                    <FileIcon extension={extension} />
                </ShouldRender>
                <ShouldRender
                    if={previewStatus !== FilePreviewStatus.Unsupported}
                >
                    <FileIcon
                        extension={extension}
                        className={cn('@cs/main:hidden', {
                            hidden: !showIcon,
                        })}
                    />
                    <div
                        className={cn('relative h-full w-full ', {
                            'hidden @cs/main:block': showIcon,
                        })}
                    >
                        <ShouldRender
                            if={
                                previewStatus ===
                                FilePreviewStatus.SupportedByFileViewer
                            }
                        >
                            <div className="absolute inset-0">
                                <ErrorBoundary
                                    fallback={
                                        <FileViewerUnsupported
                                            onSetPreviewStatus={
                                                setPreviewStatus
                                            }
                                            previewStatus={previewStatus}
                                        />
                                    }
                                >
                                    <FileViewer
                                        key={fileId}
                                        fileType={extension}
                                        filePath={fileUrl}
                                        errorComponent={() => (
                                            <FileViewerUnsupported
                                                onSetPreviewStatus={
                                                    setPreviewStatus
                                                }
                                                previewStatus={previewStatus}
                                            />
                                        )}
                                        unsupportedComponent={() => (
                                            <FileViewerUnsupported
                                                onSetPreviewStatus={
                                                    setPreviewStatus
                                                }
                                                previewStatus={previewStatus}
                                            />
                                        )}
                                    />
                                </ErrorBoundary>
                            </div>
                        </ShouldRender>
                        <ShouldRender
                            if={
                                previewStatus ===
                                FilePreviewStatus.SupportedByHTMLObject
                            }
                        >
                            <object
                                data={fileUrl}
                                width="100%"
                                height="100%"
                                name={fileName}
                                type={fileType}
                            />
                        </ShouldRender>
                    </div>
                </ShouldRender>
            </>
        )
    },
    // Custom comparison function for props
    (prev, next) =>
        prev.previewStatus === next.previewStatus &&
        prev.fileType === next.fileType &&
        prev.fileUrl === next.fileUrl &&
        prev.showIcon === next.showIcon,
)
