import React, {
    Dispatch,
    HTMLAttributes,
    MouseEventHandler,
    SetStateAction,
    memo,
    useEffect,
    useMemo,
} from 'react'

import { cn } from '@upup/core/internal'
import type { Translations } from '@upup/core'
import {
    useUploaderEditor,
    useUploaderFiles,
    useUploaderI18n,
    useUploaderOptions,
    useUploaderTheme,
    useUploaderUploadControls,
} from '../context/UploaderContext'
import {
    fileCanPreviewText,
    fileGetIsImage,
    fileGetIsPdf,
    fileGetIsText,
} from '../lib/file'
import FilePreviewThumbnail from './FilePreviewThumbnail'
import ProgressBar from './shared/ProgressBar'

type Props = {
    fileName: string
    fileType: string
    fileId: string
    fileUrl: string
    fileSize?: number | undefined
    canPreview: boolean
    setCanPreview: Dispatch<SetStateAction<boolean>>
    onRequestPreview?: (() => void) | undefined
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
        onClick,
        ...restProps
    } = props

    const { handleFileRemove, files } = useUploaderFiles()
    const { translations: tr } = useUploaderI18n()
    const { openImageEditor } = useUploaderEditor()
    const {
        upload: { filesProgressMap },
    } = useUploaderUploadControls()
    const {
        icons: { FileDeleteIcon },
        allowPreview,
        imageEditor,
    } = useUploaderOptions()
    const {
        isDark: isDarkTheme,
        slotOverrides: slotClasses,
        slots: themeSlots,
    } = useUploaderTheme()

    const isImage = useMemo(() => fileGetIsImage(fileType), [fileType])
    const isPdf = useMemo(
        () => fileGetIsPdf(fileType, fileName),
        [fileType, fileName],
    )
    const isText = useMemo(
        () => fileGetIsText(fileType, fileName),
        [fileType, fileName],
    )

    // Only allow inline text preview for files within the safe size threshold
    const canPreviewText = useMemo(
        () => fileCanPreviewText(fileType, fileName, fileSize),
        [fileType, fileName, fileSize],
    )

    const progress = useMemo(() => {
        const fileProgress = filesProgressMap[fileId]
        const loaded = fileProgress?.loaded ?? NaN
        const total = fileProgress?.total ?? NaN
        return Math.floor((loaded / total) * 100)
    }, [fileId, filesProgressMap])

    useEffect(() => {
        // Images and PDFs are always previewable; text only if below the safe size threshold.
        if ((isImage || isPdf || (isText && canPreviewText)) && !canPreview)
            setCanPreview(true)
    }, [isImage, isPdf, isText, canPreviewText, canPreview, setCanPreview])

    const onHandleFileRemove: MouseEventHandler<HTMLButtonElement> = e => {
        e.stopPropagation()
        handleFileRemove(fileId)
    }

    const onHandleEditImage: MouseEventHandler<HTMLButtonElement> = e => {
        e.stopPropagation()
        const file = files.get(fileId)
        if (file) openImageEditor(file)
    }

    const formatFileSize = (bytes: number | undefined, tr: Translations) => {
        if (!bytes || bytes === 0) return tr.zeroBytes
        const k = 1024
        const sizes = [tr.bytes, tr.kb, tr.mb, tr.gb]
        const i = Math.floor(Math.log(bytes) / Math.log(k))
        return `${Math.round((bytes / Math.pow(k, i)) * 10) / 10} ${sizes[i] ?? ''}`
    }

    return (
        <div
            className={cn('upup-inline-block', themeSlots?.filePreview?.root)}
            data-testid="upup-file-preview"
            data-upup-slot="file-preview"
            role="button"
            tabIndex={0}
            onClick={onClick}
            onKeyDown={e => {
                if (e.key === 'Enter' || e.key === ' ') {
                    onClick?.(e as unknown as React.MouseEvent<HTMLDivElement>)
                }
            }}
            {...restProps}
        >
            <div
                className={cn(
                    'upup-relative upup-h-[145px] upup-w-[145px] upup-overflow-hidden upup-rounded-lg upup-bg-white upup-shadow-sm',
                    'upup-bg-contain upup-bg-center upup-bg-no-repeat',
                    {
                        [slotClasses.fileThumbnailMultiple ?? '']:
                            slotClasses.fileThumbnailMultiple && files.size > 1,
                        [slotClasses.fileThumbnailSingle ?? '']:
                            slotClasses.fileThumbnailSingle && files.size === 1,
                    },
                    themeSlots?.filePreview?.thumbnail,
                )}
                style={
                    isImage ? { backgroundImage: `url(${fileUrl})` } : undefined
                }
            >
                {!isImage && (
                    <div className="upup-flex upup-h-full upup-items-center upup-justify-center upup-p-6">
                        <FilePreviewThumbnail
                            canPreview={canPreview}
                            setCanPreview={setCanPreview}
                            fileType={fileType}
                            fileName={fileName}
                            fileUrl={fileUrl}
                            fileSize={fileSize}
                            allowPreview={allowPreview}
                            slotClasses={slotClasses}
                            labels={tr}
                        />
                    </div>
                )}

                {isImage && imageEditor.enabled && (
                    <button
                        className={cn(
                            'upup-absolute upup-right-1.5 upup-top-8 upup-z-10',
                            'upup-flex upup-h-5 upup-w-5 upup-items-center upup-justify-center',
                            'upup-rounded-full upup-bg-white upup-text-blue-600 upup-shadow-sm',
                            'hover:upup-bg-white hover:upup-text-blue-700',
                            'upup-ring-1 upup-ring-black/5',
                            'disabled:upup-cursor-not-allowed disabled:upup-opacity-50',
                        )}
                        onClick={onHandleEditImage}
                        type="button"
                        disabled={!!progress}
                        aria-label={tr.editImage}
                    >
                        <svg
                            xmlns="http://www.w3.org/2000/svg"
                            viewBox="0 0 20 20"
                            fill="currentColor"
                            className="upup-h-3 upup-w-3"
                            aria-hidden="true"
                        >
                            <path d="M2.695 14.763l-1.262 3.154a.5.5 0 00.65.65l3.155-1.262a4 4 0 001.343-.885L17.5 5.5a2.121 2.121 0 00-3-3L3.58 13.42a4 4 0 00-.885 1.343z" />
                        </svg>
                    </button>
                )}

                <button
                    className={cn(
                        'upup-absolute upup-right-1.5 upup-top-1.5 upup-z-10',
                        'upup-flex upup-h-5 upup-w-5 upup-items-center upup-justify-center',
                        'upup-rounded-full upup-bg-white upup-text-red-600 upup-shadow-sm',
                        'hover:upup-bg-white hover:upup-text-red-700',
                        'upup-ring-1 upup-ring-black/5',
                        'disabled:upup-cursor-not-allowed disabled:upup-opacity-50',
                        slotClasses.fileDeleteButton,
                        themeSlots?.filePreview?.deleteButton,
                    )}
                    onClick={onHandleFileRemove}
                    type="button"
                    disabled={!!progress}
                    aria-label={tr.removeFile}
                    data-testid="upup-file-remove"
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
                <div
                    className={cn(
                        'upup-truncate upup-text-[13px] upup-font-normal upup-leading-tight upup-text-gray-900',
                        { 'upup-text-white': isDarkTheme },
                        themeSlots?.filePreview?.name,
                    )}
                >
                    {fileName}
                </div>
                <div
                    className={cn(
                        'upup-mt-0.5 upup-text-[11px] upup-leading-tight upup-text-gray-500',
                        { 'upup-text-gray-400': isDarkTheme },
                        themeSlots?.filePreview?.size,
                    )}
                >
                    {formatFileSize(fileSize, tr)}
                </div>
                {allowPreview && canPreview && (
                    <button
                        type="button"
                        className={cn(
                            'upup-mt-1 upup-text-[11px] upup-font-normal upup-leading-tight upup-text-[#2563eb] upup-transition-all hover:upup-text-blue-700 hover:upup-underline',
                            {
                                'upup-text-[#4A9EFF] hover:upup-text-blue-300':
                                    isDarkTheme,
                            },
                            themeSlots?.filePreview?.previewButton,
                        )}
                        onClick={onRequestPreview}
                    >
                        {tr.clickToPreview}
                    </button>
                )}
            </div>
        </div>
    )
})
