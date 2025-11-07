import React, {
    Dispatch,
    HTMLAttributes,
    MouseEventHandler,
    SetStateAction,
    memo,
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
    fileSize?: number
    canPreview: boolean
    setCanPreview: Dispatch<SetStateAction<boolean>>
    onRequestPreview?: () => void
} & HTMLAttributes<HTMLDivElement>

export default memo(function FilePreview(props: Props) {
    const {
        fileType,
        fileId,
        fileName,
        fileUrl,
        fileSize,
        canPreview,
        setCanPreview,
        onRequestPreview,
        ...restProps
    } = props

    const {
        handleFileRemove,
        upload: { filesProgressMap },
        props: {
            classNames,
            icons: { FileDeleteIcon },
            allowPreview,
        },
        files,
    } = useRootContext()

    const isImage = useMemo(() => fileGetIsImage(fileType), [fileType])
    const isText = useMemo(() => {
        if (!fileType) return false
        if (fileType.startsWith('text/')) return true
        const lower = fileName.toLowerCase()
        return (
            lower.endsWith('.txt') ||
            lower.endsWith('.md') ||
            lower.endsWith('.json') ||
            lower.endsWith('.csv') ||
            lower.endsWith('.log') ||
            lower.endsWith('.js') ||
            lower.endsWith('.ts') ||
            lower.endsWith('.css') ||
            lower.endsWith('.html')
        )
    }, [fileType, fileName])

    const progress = useMemo(
        () =>
            Math.floor(
                (filesProgressMap[fileId]?.loaded /
                    filesProgressMap[fileId]?.total) *
                    100,
            ),
        [fileId, filesProgressMap],
    )

    useEffect(() => {
        if ((isImage || isText) && !canPreview) setCanPreview(true)
    }, [isImage, isText, canPreview, setCanPreview])

    const onHandleFileRemove: MouseEventHandler<HTMLButtonElement> = e => {
        e.stopPropagation()
        handleFileRemove(fileId)
    }

    const formatFileSize = (bytes?: number) => {
        if (!bytes || bytes === 0) return '0 Byte'
        const k = 1024
        const sizes = ['Bytes', 'KB', 'MB', 'GB']
        const i = Math.floor(Math.log(bytes) / Math.log(k))
        return Math.round((bytes / Math.pow(k, i)) * 10) / 10 + ' ' + sizes[i]
    }

    return (
        <div className="upup-inline-block" {...restProps}>
            <div
                className={cn(
                    'upup-relative upup-h-[145px] upup-w-[145px] upup-overflow-hidden upup-rounded-lg upup-bg-white upup-shadow-sm',
                    'upup-bg-contain upup-bg-center upup-bg-no-repeat',
                    {
                        [classNames.fileThumbnailMultiple!]:
                            classNames.fileThumbnailMultiple && files.size > 1,
                        [classNames.fileThumbnailSingle!]:
                            classNames.fileThumbnailSingle && files.size === 1,
                    },
                )}
                style={
                    isImage ? { backgroundImage: `url(${fileUrl})` } : undefined
                }
            >
                <ShouldRender if={!isImage}>
                    <div className="upup-flex upup-h-full upup-items-center upup-justify-center upup-p-6">
                        <FilePreviewThumbnail
                            canPreview={canPreview}
                            setCanPreview={setCanPreview}
                            fileType={fileType}
                            fileName={fileName}
                            fileUrl={fileUrl}
                            allowPreview={allowPreview}
                            classNames={classNames}
                        />
                    </div>
                </ShouldRender>

                <button
                    className={cn(
                        'upup-absolute upup-right-1.5 upup-top-1.5 upup-z-10',
                        'upup-flex upup-h-5 upup-w-5 upup-items-center upup-justify-center',
                        'upup-rounded-full upup-bg-white upup-text-red-600 upup-shadow-sm',
                        'hover:upup-bg-white hover:upup-text-red-700',
                        'upup-ring-1 upup-ring-black/5',
                        'disabled:upup-cursor-not-allowed disabled:upup-opacity-50',
                        classNames.fileDeleteButton,
                    )}
                    onClick={onHandleFileRemove}
                    type="button"
                    disabled={!!progress}
                    aria-label="Remove file"
                >
                    <FileDeleteIcon className="upup-h-3 upup-w-3" />
                </button>

                <ProgressBar
                    className="upup-absolute upup-bottom-0 upup-left-0 upup-right-0"
                    progressBarClassName="upup-rounded-t-none upup-rounded-b-md"
                    progress={progress}
                />
            </div>

            <div className="upup-mt-1 upup-px-0.5">
                <div className="upup-truncate upup-text-[13px] upup-font-normal upup-leading-tight upup-text-white">
                    {fileName}
                </div>
                <div className="upup-mt-0.5 upup-text-[11px] upup-leading-tight upup-text-gray-400">
                    {formatFileSize(fileSize)}
                </div>
                {allowPreview && canPreview && (
                    <button
                        type="button"
                        className="upup-mt-1 upup-text-[11px] upup-font-normal upup-leading-tight upup-text-[#4A9EFF] upup-transition-all hover:upup-text-blue-300 hover:upup-underline"
                        onClick={onRequestPreview}
                    >
                        Click to preview
                    </button>
                )}
            </div>
        </div>
    )
})
