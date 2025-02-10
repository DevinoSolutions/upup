import React, {
    Dispatch,
    HTMLAttributes,
    MouseEventHandler,
    SetStateAction,
    forwardRef,
    memo,
    useCallback,
    useEffect,
    useMemo,
} from 'react'
import { useRootContext } from '../context/RootContext'
import { fileGetIsImage } from '../lib/file'
import { cn } from '../lib/tailwind'
import FilePreviewThumbnail from './FilePreviewThumbnail'
import ProgressBar from './shared/ProgressBar'
import ShouldRender from './shared/ShouldRender'

type Props = {
    fileName: string
    fileType: string
    fileId: string
    fileUrl: string
    canPreview: boolean
    setCanPreview: Dispatch<SetStateAction<boolean>>
} & HTMLAttributes<HTMLDivElement>

export default memo(
    forwardRef<HTMLDivElement, Props>(function FilePreview(
        {
            fileType,
            fileId,
            fileName,
            fileUrl,
            canPreview,
            setCanPreview,
            ...restProps
        },
        ref,
    ) {
        const {
            handleFileRemove,
            upload: { filesProgressMap },
            props: {
                dark,
                classNames,
                icons: { FileDeleteIcon },
            },
            files,
        } = useRootContext()
        const isImage = useMemo(() => fileGetIsImage(fileType), [fileType])
        const progress = useMemo(
            () =>
                Math.floor(
                    (filesProgressMap[fileId]?.loaded /
                        filesProgressMap[fileId]?.total) *
                        100,
                ),
            [fileId, filesProgressMap],
        )

        const onHandleFileRemove: MouseEventHandler<HTMLButtonElement> =
            useCallback(
                e => {
                    e.stopPropagation()
                    handleFileRemove(fileId)
                },
                [fileId, handleFileRemove],
            )

        useEffect(() => {
            if (isImage && !canPreview) setCanPreview(true)
        }, [isImage, canPreview])

        return (
            <div
                ref={ref}
                className={cn(
                    'shadow-right flex cursor-pointer items-center justify-center rounded-b-[4px] rounded-l bg-white bg-contain bg-center bg-no-repeat @cs/main:relative @cs/main:rounded-r @cs/main:shadow-md',
                    {
                        'bg-[#232323] dark:bg-[#232323]': dark,
                        'aspect-square w-14 @cs/main:w-full': files.size > 1,
                        'flex-1': files.size === 1,
                        [classNames.fileThumbnailMultiple!]:
                            classNames.fileThumbnailMultiple && files.size > 1,
                        [classNames.fileThumbnailSingle!]:
                            classNames.fileThumbnailSingle && files.size === 1,
                    },
                )}
                style={
                    isImage
                        ? {
                              backgroundImage: `url(${fileUrl})`,
                          }
                        : undefined
                }
                {...restProps}
            >
                <ShouldRender if={!isImage}>
                    <FilePreviewThumbnail
                        canPreview={canPreview}
                        setCanPreview={setCanPreview}
                        fileType={fileType}
                        fileName={fileName}
                        fileUrl={fileUrl}
                        showIcon={files.size > 1}
                    />
                </ShouldRender>
                <button
                    className={cn(
                        'z-1 absolute -right-[10px] -top-[10px] scale-90 rounded-full @cs/main:scale-100',
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
                    progressBarClassName="rounded-t-none"
                    progress={progress}
                />
            </div>
        )
    }),
)
