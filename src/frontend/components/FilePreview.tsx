import React, { Dispatch, MouseEventHandler, SetStateAction, memo } from 'react'
import FileViewer from 'react-file-viewer'
import { v4 as uuidv4 } from 'uuid'
import { useRootContext } from '../context/RootContext'
import { cn } from '../lib/tailwind'
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
        props: {
            onFileClick,
            onError,
            dark,
            classNames,
            icons: { FileDeleteIcon },
        },
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
            className={cn(
                'flex cursor-pointer items-center justify-center rounded bg-white bg-contain bg-center bg-no-repeat md:relative md:shadow-md',
                {
                    'bg-[#232323] dark:bg-[#232323]': dark,
                    ['aspect-square max-sm:w-14' +
                    classNames.fileThumbnailMultiple]: files.length > 1,
                    ['flex-1' + classNames.fileThumbnailSingle]:
                        files.length === 1,
                },
            )}
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
                    <FileIcon extension={extension} />
                </ShouldRender>
                <ShouldRender if={!previewIsUnsupported}>
                    <FileIcon extension={extension} className="sm:hidden" />
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
                className={cn(
                    'z-1 absolute -right-[10px] -top-[10px] rounded-full max-md:scale-90',
                    classNames.fileDeleteButton,
                )}
                onClick={onHandleFileRemove}
                type="button"
                disabled={!!progress}
            >
                <FileDeleteIcon className="text-2xl text-red-500" />
            </button>
            <ProgressBar
                className="absolute bottom-0 left-0 right-0"
                progressBarClassName="rounded-b"
                progress={progress}
            />
        </div>
    )
})
