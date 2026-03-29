'use client'

import React, {
    Dispatch,
    HTMLAttributes,
    KeyboardEventHandler,
    MouseEventHandler,
    SetStateAction,
    memo,
    useCallback,
    useEffect,
    useMemo,
    useRef,
    useState,
} from 'react'
import type { UploadFile } from '@upup/shared'
import { UploadStatus } from '@upup/shared'
import { useUploaderContext } from '../context/uploader-context'
import { fileCanPreviewText, fileGetIsImage, fileGetIsText } from '../lib/file'
import { cn } from '../lib/tailwind'
import FilePreviewThumbnail from './file-preview-thumbnail'
import ProgressBar from './progress-bar'

type Props = {
    file: UploadFile
    canPreview: boolean
    setCanPreview: Dispatch<SetStateAction<boolean>>
    allowPreview?: boolean
    onRequestPreview?: () => void
    onEditImage?: (file: UploadFile) => void
    showRemoveButtonAfterComplete?: boolean
    imageEditorEnabled?: boolean
    renameEnabled?: boolean
} & HTMLAttributes<HTMLDivElement>

function formatFileSize(bytes: number | undefined): string {
    if (!bytes || bytes === 0) return '0 B'
    const k = 1024
    const sizes = ['B', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return Math.round((bytes / Math.pow(k, i)) * 10) / 10 + ' ' + sizes[i]
}

export default memo(function FilePreview(props: Props) {
    const {
        file,
        canPreview,
        setCanPreview,
        allowPreview = false,
        onRequestPreview,
        onEditImage,
        showRemoveButtonAfterComplete = false,
        imageEditorEnabled = false,
        renameEnabled = true,
        ...restProps
    } = props

    const {
        removeFile,
        status,
        files,
        dark,
        classNames,
        icons: { FileDeleteIcon },
    } = useUploaderContext()

    const [isRenaming, setIsRenaming] = useState(false)
    const [renameValue, setRenameValue] = useState('')
    const renameInputRef = useRef<HTMLInputElement>(null)

    const isImage = useMemo(() => fileGetIsImage(file.type), [file.type])
    const isText = useMemo(
        () => fileGetIsText(file.type, file.name),
        [file.type, file.name],
    )
    const canPreviewText = useMemo(
        () => fileCanPreviewText(file.type, file.name, file.size),
        [file.type, file.name, file.size],
    )

    // Per-file progress — not available in v2 context; show indeterminate if uploading
    const isUploading = status === UploadStatus.UPLOADING

    useEffect(() => {
        if ((isImage || (isText && canPreviewText)) && !canPreview)
            setCanPreview(true)
    }, [isImage, isText, canPreviewText, canPreview, setCanPreview])

    const onHandleFileRemove: MouseEventHandler<HTMLButtonElement> = e => {
        e.stopPropagation()
        removeFile(file.id)
    }

    const onHandleEditImage: MouseEventHandler<HTMLButtonElement> = e => {
        e.stopPropagation()
        onEditImage?.(file)
    }

    const startRename = useCallback(() => {
        if (!renameEnabled || isUploading) return
        const dotIdx = file.name.lastIndexOf('.')
        setRenameValue(dotIdx > 0 ? file.name.slice(0, dotIdx) : file.name)
        setIsRenaming(true)
    }, [file.name, isUploading, renameEnabled])

    const commitRename = useCallback(() => {
        setIsRenaming(false)
        // Rename is not yet wired to a context method in v2; no-op for now
    }, [])

    const onRenameKeyDown: KeyboardEventHandler<HTMLInputElement> = e => {
        if (e.key === 'Enter') {
            e.preventDefault()
            commitRename()
        } else if (e.key === 'Escape') {
            setIsRenaming(false)
        }
    }

    useEffect(() => {
        if (isRenaming && renameInputRef.current) {
            renameInputRef.current.focus()
            renameInputRef.current.select()
        }
    }, [isRenaming])

    const showDeleteButton =
        showRemoveButtonAfterComplete || status !== UploadStatus.SUCCESSFUL

    return (
        <div className="upup-inline-block" {...restProps}>
            <div
                className={cn(
                    'upup-relative upup-h-[145px] upup-w-[145px] upup-overflow-hidden upup-rounded-lg upup-bg-white upup-shadow-sm',
                    'upup-bg-contain upup-bg-center upup-bg-no-repeat',
                    {
                        [classNames.fileThumbnailMultiple!]:
                            classNames.fileThumbnailMultiple &&
                            files.length > 1,
                        [classNames.fileThumbnailSingle!]:
                            classNames.fileThumbnailSingle &&
                            files.length === 1,
                    },
                )}
                style={
                    isImage
                        ? { backgroundImage: `url(${file.url})` }
                        : undefined
                }
            >
                {!isImage && (
                    <div className="upup-flex upup-h-full upup-items-center upup-justify-center upup-p-6">
                        <FilePreviewThumbnail
                            canPreview={canPreview}
                            setCanPreview={setCanPreview}
                            fileType={file.type}
                            fileName={file.name}
                            fileUrl={file.url ?? ''}
                            fileSize={file.size}
                            allowPreview={allowPreview}
                            classNames={classNames}
                        />
                    </div>
                )}

                {isImage && imageEditorEnabled && (
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
                        disabled={isUploading}
                        aria-label="Edit image"
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

                {showDeleteButton && (
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
                        disabled={isUploading}
                        aria-label="Remove file"
                    >
                        {FileDeleteIcon && <FileDeleteIcon className="upup-h-3 upup-w-3" />}
                    </button>
                )}

                {isUploading && (
                    <ProgressBar
                        className="upup-absolute upup-bottom-0 upup-left-0 upup-right-0"
                        progressBarClassName="upup-rounded-t-none upup-rounded-b-md"
                        progress={0}
                    />
                )}
            </div>

            <div className="upup-mt-1 upup-px-0.5">
                {isRenaming ? (
                    <input
                        ref={renameInputRef}
                        type="text"
                        value={renameValue}
                        onChange={e => setRenameValue(e.target.value)}
                        onBlur={commitRename}
                        onKeyDown={onRenameKeyDown}
                        className="upup-w-full upup-rounded upup-border upup-border-blue-400 upup-bg-gray-800 upup-px-1 upup-text-[13px] upup-font-normal upup-leading-tight upup-text-white upup-outline-none"
                    />
                ) : (
                    <div
                        className={cn(
                            'upup-truncate upup-text-[13px] upup-font-normal upup-leading-tight upup-text-white',
                            renameEnabled && !isUploading
                                ? 'upup-cursor-pointer hover:upup-text-blue-300'
                                : 'upup-cursor-default',
                        )}
                        onClick={startRename}
                        onKeyDown={e => {
                            if (e.key === 'Enter' || e.key === ' ') {
                                e.preventDefault()
                                startRename()
                            }
                        }}
                        tabIndex={renameEnabled ? 0 : -1}
                        role={renameEnabled ? 'button' : undefined}
                        title="Rename file"
                    >
                        {file.name}
                    </div>
                )}
                <div className="upup-mt-0.5 upup-text-[11px] upup-leading-tight upup-text-gray-400">
                    {formatFileSize(file.size)}
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
