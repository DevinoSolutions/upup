import React, { Dispatch, SetStateAction, memo, useMemo } from 'react'
import { fileGetExtension, fileIs3D } from '../lib/file'
import { cn } from '../lib/tailwind'
import FileIcon from './FileIcon'
import ShouldRender from './shared/ShouldRender'
import { UpupUploaderPropsClassNames } from '../../shared/types'

type Props = {
    canPreview: boolean
    setCanPreview: Dispatch<SetStateAction<boolean>>
    fileType: string
    fileName: string
    fileUrl: string
    showIcon: boolean
    classNames: UpupUploaderPropsClassNames
}

export default memo(
    function FilePreviewThumbnail({
                                      canPreview,
                                      setCanPreview,
                                      fileUrl,
                                      fileName,
                                      fileType,
                                      showIcon,
                                      classNames,
                                  }: Props) {
        const extension = useMemo(
            () => fileGetExtension(fileType, fileName),
            [fileType, fileName],
        )

        // New check for 3D
        const is3D = useMemo(() => {
            return fileIs3D(extension?.toLowerCase() || '')
        }, [extension])

        if (is3D) {
            return (
                <div className="flex flex-col items-center gap-2">
                    <FileIcon
                        extension={extension}
                        className={classNames.fileIcon}
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
                        <p>Loading...</p>
                    </object>
                    <FileIcon extension={extension} />
                </ShouldRender>

                <ShouldRender if={canPreview}>
                    <FileIcon
                        extension={extension}
                        className={cn('@cs/main:hidden', {
                            hidden: !showIcon,
                        }, classNames.fileIcon
                        )}
                    />
                    <div
                        className={cn('relative h-full w-full', {
                            'hidden @cs/main:block': showIcon,
                        })}
                    >
                        <object
                            data={fileUrl}
                            width="100%"
                            height="100%"
                            name={fileName}
                            type={fileType}
                            className="absolute max-h-full max-w-full"
                        >
                            <p>Loading...</p>
                        </object>
                    </div>
                </ShouldRender>
            </>
        )
    },
    (prev, next) =>
        prev.canPreview === next.canPreview &&
        prev.fileType === next.fileType &&
        prev.fileUrl === next.fileUrl &&
        prev.showIcon === next.showIcon,
)
