import React, {
    Dispatch,
    HTMLAttributes,
    MouseEventHandler,
    SetStateAction,
    memo,
    useEffect,
    useMemo,
} from 'react'

import { cn } from '@upupjs/core/internal'
import { UploadStatus } from '@upupjs/core'
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
    formatFileSize,
} from '../lib/file'
import FilePreviewThumbnail from './FilePreviewThumbnail'
import ProgressBar from './shared/ProgressBar'
import FileSuccessCheck from './shared/FileSuccessCheck'
import EditIcon from './shared/EditIcon'

type Props = {
    fileName: string
    fileType: string
    fileId: string
    fileUrl: string
    fileSize?: number | undefined
    canPreview: boolean
    setCanPreview: Dispatch<SetStateAction<boolean>>
    onRequestPreview?: (() => void) | undefined
    /** Position in the sorted list — drives the completion-check stagger. */
    index?: number
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
        index = 0,
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
    const isVideo = useMemo(() => fileType.startsWith('video/'), [fileType])
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
        const pct = Math.floor((loaded / total) * 100)
        // No progress entry ⇒ NaN; total === 0 ⇒ Infinity. Either would render
        // width:NaN%/aria-valuenow=NaN in ProgressBar while an upload is active.
        return Number.isFinite(pct) ? pct : 0
    }, [fileId, filesProgressMap])

    useEffect(() => {
        // Images and PDFs are always previewable; text only if below the safe size threshold.
        if ((isImage || isPdf || (isText && canPreviewText)) && !canPreview)
            setCanPreview(true)
    }, [isImage, isPdf, isText, canPreviewText, canPreview, setCanPreview])

    const fileStatus = files.get(fileId)?.status
    const isSuccessful = fileStatus === UploadStatus.SUCCESSFUL
    // Edit stays available pre- AND post-upload — only an in-flight file is busy
    // (round-8 item 1). Editing a completed image re-opens the editor; it does
    // not re-trigger the upload by itself (openImageEditor semantics).
    const isBusy =
        fileStatus === UploadStatus.UPLOADING ||
        fileStatus === UploadStatus.PROCESSING

    const onHandleFileRemove: MouseEventHandler<HTMLButtonElement> = e => {
        e.stopPropagation()
        handleFileRemove(fileId)
    }

    const onHandleEditImage: MouseEventHandler<HTMLButtonElement> = e => {
        e.stopPropagation()
        const file = files.get(fileId)
        if (file) openImageEditor(file)
    }

    return (
        <div
            // Fills its grid cell (auto-fit minmax(160px,1fr) in FileList), so the
            // tile stretches to share the row evenly — no dead columns at 2/3
            // files. The cell has a definite width, so the caption `truncate`
            // still works without an explicit pixel width here.
            className={cn(
                'upup-block upup-w-full',
                themeSlots?.filePreview?.root,
            )}
            data-testid="upup-file-preview"
            data-upup-slot="file-preview"
            {...restProps}
        >
            <div
                className={cn(
                    // Chrome-language tile (spec §3): translucent card + hairline
                    // ring, sky accents. Image tiles paint the picture over it.
                    // Fluid width, fixed height — fills the cell horizontally but
                    // never balloons vertically in the widest (2-file) row.
                    'upup-fx-hover-lift upup-relative upup-h-[160px] upup-w-full upup-overflow-hidden upup-rounded-xl upup-ring-1',
                    'upup-bg-contain upup-bg-center upup-bg-no-repeat',
                    isDarkTheme
                        ? 'upup-bg-white/[0.055] upup-ring-white/[0.08]'
                        : 'upup-bg-black/[0.04] upup-ring-black/[0.06]',
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
                {/* Whole-thumbnail click affordance: a real <button> that is a
                    sibling of the edit/remove controls (never their ancestor), so
                    no interactive element nests inside another (axe
                    nested-interactive). It sits behind the action buttons
                    (z-0 < z-10) and is transparent so the thumbnail shows through. */}
                <button
                    type="button"
                    aria-label={fileName}
                    className="upup-absolute upup-inset-0 upup-z-0 upup-cursor-pointer"
                    onClick={e =>
                        onClick?.(
                            e as unknown as React.MouseEvent<HTMLDivElement>,
                        )
                    }
                />
                {isVideo && (
                    // First-frame video thumbnail — no controls chrome (the
                    // native player pill read as broken CSS in a 145px tile).
                    <video
                        src={fileUrl}
                        muted
                        playsInline
                        preload="metadata"
                        className="upup-pointer-events-none upup-absolute upup-inset-0 upup-h-full upup-w-full upup-object-cover"
                    />
                )}
                {!isImage && !isVideo && (
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
                            // Hero-chrome action button (matches FileHero's
                            // remove): translucent dark square. Sits below the
                            // trash normally; once the file is done (trash gone)
                            // it slides up to the top slot.
                            'upup-fx-press upup-absolute upup-right-1.5 upup-z-10',
                            isSuccessful ? 'upup-top-1.5' : 'upup-top-9',
                            'upup-flex upup-h-[30px] upup-w-[30px] upup-items-center upup-justify-center',
                            'upup-rounded-[8px] upup-bg-[#04080f]/40 upup-text-[#e2e8f0]',
                            'hover:upup-bg-[#04080f]/65',
                            'disabled:upup-cursor-not-allowed disabled:upup-opacity-50',
                        )}
                        onClick={onHandleEditImage}
                        type="button"
                        disabled={isBusy}
                        aria-label={tr.editImage}
                        data-testid="upup-file-edit"
                    >
                        <EditIcon className="upup-h-[18px] upup-w-[18px]" />
                    </button>
                )}

                {/* Delete disappears once the file has uploaded successfully —
                    the completion check is then the only overlay affordance. */}
                {!isSuccessful && (
                    <button
                        className={cn(
                            'upup-fx-remove upup-fx-press upup-absolute upup-right-1.5 upup-top-1.5 upup-z-10',
                            'upup-flex upup-h-[30px] upup-w-[30px] upup-items-center upup-justify-center',
                            'upup-rounded-[8px] upup-bg-[#04080f]/40 upup-text-[#e2e8f0]',
                            'hover:upup-bg-[#04080f]/65',
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
                        <FileDeleteIcon className="upup-h-5 upup-w-5" />
                    </button>
                )}

                {isSuccessful && (
                    <FileSuccessCheck
                        index={index}
                        size={20}
                        className="upup-absolute upup-left-1.5 upup-top-1.5 upup-z-10"
                    />
                )}

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
                            'upup-mt-1 upup-text-[11px] upup-font-normal upup-leading-tight upup-text-[#0284c7] upup-transition-all hover:upup-text-[#0284c7] hover:upup-underline',
                            {
                                'upup-text-[#38bdf8] hover:upup-text-[#7dd3fc]':
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
