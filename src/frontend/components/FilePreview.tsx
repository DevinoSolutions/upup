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
        }, [isImage, canPreview, setCanPreview])

        return (
            <div
                ref={ref}
                className={cn(
                    'upup-shadow-right @cs/main:relative @cs/main:rounded-r @cs/main:shadow-md upup-flex upup-cursor-pointer upup-items-center upup-justify-center upup-rounded-b-[4px] upup-rounded-l upup-bg-white upup-bg-contain upup-bg-center upup-bg-no-repeat',
                    {
                        'upup-bg-[#232323] dark:upup-bg-[#232323]': dark,
                        '@cs/main:w-full upup-aspect-square upup-w-14':
                            files.size > 1,
                        'upup-flex-1': files.size === 1,
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
                        classNames={classNames}
                    />
                </ShouldRender>
                <button
                    className={cn(
                        'upup-z-1 @cs/main:scale-100 upup-absolute upup--right-[10px] upup--top-[10px] upup-scale-90 upup-rounded-full',
                        classNames.fileDeleteButton,
                    )}
                    onClick={onHandleFileRemove}
                    type="button"
                    disabled={!!progress}
                >
                    <FileDeleteIcon className="upup-text-2xl upup-text-red-500" />
                </button>
                <ProgressBar
                    className="upup-absolute upup-bottom-0 upup-left-0 upup-right-0"
                    progressBarClassName="upup-rounded-t-none"
                    progress={progress}
                />
            </div>
        )
    }),
)
