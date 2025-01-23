import React, { Dispatch, MouseEventHandler, SetStateAction, memo } from 'react'
import FileViewer from 'react-file-viewer'
import { TbX } from 'react-icons/tb'
import { v4 as uuidv4 } from 'uuid'
import { useRootContext } from '../context/RootContext'
import FileIcon from './FileIcon'
import FilePreviewUnsupported from './FilePreviewUnsupported'
import ProgressBar from './shared/ProgressBar'
import ShouldRender from './shared/ShouldRender'

type Props = {
    file: File
    objectUrl: string
    previewIsUnsupported: boolean
    setPreviewIsUnsupported: Dispatch<SetStateAction<boolean>>
}

export default memo(function FilePreview({
    file,
    objectUrl,
    previewIsUnsupported,
    setPreviewIsUnsupported,
}: Props) {
    const {
        handleFileRemove,
        upload: { filesProgressMap },
        props: { onFileClick, onError },
        files,
    } = useRootContext()
    const extension = file.type.split('/')[1]
    const isImage = file.type.startsWith('image/')
    const progress = Math.floor(
        (filesProgressMap[file.name]?.loaded /
            filesProgressMap[file.name]?.total) *
            100,
    )

    const onHandleFileRemove: MouseEventHandler<HTMLButtonElement> = e => {
        e.stopPropagation()
        handleFileRemove(file)
    }

    return (
        <div
            className={`flex cursor-pointer items-center justify-center rounded bg-white bg-contain bg-center bg-no-repeat md:relative ${
                files.length > 1 ? 'aspect-square max-sm:w-14' : 'flex-1'
            } md:shadow-md`}
            onClick={() => onFileClick(file)}
            style={
                isImage
                    ? {
                          backgroundImage: `url(${objectUrl})`,
                      }
                    : undefined
            }
        >
            <ShouldRender if={!isImage}>
                <ShouldRender if={previewIsUnsupported}>
                    <FileIcon
                        key={uuidv4()}
                        extension={extension}
                        className="text-4xl text-blue-600 md:text-7xl"
                    />
                </ShouldRender>
                <ShouldRender if={!previewIsUnsupported}>
                    <FileIcon
                        key={uuidv4()}
                        extension={extension}
                        className="text-4xl text-blue-600 sm:hidden md:text-7xl"
                    />
                    <div className="relative h-full w-full max-sm:hidden">
                        <div className="absolute inset-0">
                            <FileViewer
                                key={uuidv4()}
                                fileType={extension}
                                filePath={objectUrl}
                                onError={(e: Error) =>
                                    onError('Error in file preview:' + e)
                                }
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
            </ShouldRender>
            <button
                className="z-1 absolute -right-2 -top-2 rounded-full border border-[#858585] bg-[#f4f4f4] p-0.5 max-md:scale-90"
                onClick={onHandleFileRemove}
                type="button"
                disabled={!!progress}
            >
                <TbX className="h-4 w-4 text-[#858585]" />
            </button>
            <ProgressBar
                className="absolute bottom-0 left-0 right-0"
                progressBarClassName="rounded-b"
                progress={progress}
            />
        </div>
    )
})
