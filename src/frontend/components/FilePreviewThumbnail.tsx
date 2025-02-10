import React, { Dispatch, SetStateAction, memo, useMemo } from 'react'
import { fileGetExtension } from '../lib/file'
import { cn } from '../lib/tailwind'
import FileIcon from './FileIcon'
import ShouldRender from './shared/ShouldRender'

type Props = {
    canPreview: boolean
    setCanPreview: Dispatch<SetStateAction<boolean>>
    fileType: string
    fileName: string
    fileUrl: string
    showIcon: boolean
}

export default memo(
    function FilePreviewThumbnail({
        canPreview,
        setCanPreview,
        fileUrl,
        fileName,
        fileType,
        showIcon,
    }: Props) {
        const extension = useMemo(
            () => fileGetExtension(fileType, fileName),
            [fileType, fileName],
        )

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
                        <p>Loading...</p>
                    </object>
                    <FileIcon extension={extension} />
                </ShouldRender>
                <ShouldRender if={canPreview}>
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
                        <object
                            data={fileUrl}
                            width="100%"
                            height="100%"
                            name={fileName}
                            type={fileType}
                        >
                            <p>Loading...</p>
                        </object>
                    </div>
                </ShouldRender>
            </>
        )
    },
    // Custom comparison function for props
    (prev, next) =>
        prev.canPreview === next.canPreview &&
        prev.fileType === next.fileType &&
        prev.fileUrl === next.fileUrl &&
        prev.showIcon === next.showIcon,
)
