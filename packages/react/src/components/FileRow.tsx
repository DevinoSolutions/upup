import React, { memo, useMemo } from 'react'
import { cn } from '@upupjs/core/internal'
import { UploadStatus, fileTypeIconName, type UploadFile } from '@upupjs/core'
import {
    useUploaderEditor,
    useUploaderFiles,
    useUploaderI18n,
    useUploaderOptions,
    useUploaderTheme,
    useUploaderUploadControls,
} from '../context/UploaderContext'
import { fileGetExtension, fileGetIsImage, formatFileSize } from '../lib/file'
import Icon from './Icon'
import ProgressBar from './shared/ProgressBar'
import FileSuccessCheck from './shared/FileSuccessCheck'
import EditIcon from './shared/EditIcon'

const ARCHIVE_EXTENSIONS = new Set([
    'zip',
    'rar',
    '7z',
    'tar',
    'gz',
    'bz2',
    'xz',
])

/**
 * Per-category thumbnail treatment for non-media rows so pdf / archive / audio /
 * generic no longer all read as the same blue doc: a distinct gradient tint plus
 * the type-specific glyph (audio uses the waveform icon; the rest use the
 * file-<ext> registry icon, falling back to the generic file glyph).
 */
function nonMediaThumb(
    type: string,
    name: string,
): {
    gradient: string
    icon: 'audio' | ReturnType<typeof fileTypeIconName>
} {
    const ext = fileGetExtension(type, name)
    if (type.startsWith('audio/'))
        return {
            gradient: 'linear-gradient(135deg,#a855f7,#6366f1)',
            icon: 'audio',
        }
    if (ext === 'pdf' || type === 'application/pdf')
        return {
            gradient: 'linear-gradient(135deg,#f43f5e,#ec4899)',
            icon: 'file-pdf',
        }
    if (ARCHIVE_EXTENSIONS.has(ext) || type.includes('zip'))
        return {
            gradient: 'linear-gradient(135deg,#f59e0b,#f97316)',
            icon: fileTypeIconName(ext === 'zip' ? 'zip' : ext),
        }
    return {
        gradient: 'linear-gradient(135deg,#0ea5e9,#6366f1)',
        icon: fileTypeIconName(ext),
    }
}

type Props = {
    file: UploadFile
    /** Position in the sorted list — drives the completion-check stagger. */
    index?: number
}

/**
 * Compact list-mode row (spec §4 state 3, states-tour-v2.html "multiple files").
 * A horizontal card: thumbnail · name/size · remove. The grid-mode tile
 * (FilePreview) keeps the richer affordances (edit, click-to-preview); the row
 * is the dense overview and matches the mockup exactly.
 */
export default memo(function FileRow({ file, index = 0 }: Props) {
    const { handleFileRemove } = useUploaderFiles()
    const { translations: tr } = useUploaderI18n()
    const {
        icons: { FileDeleteIcon },
        imageEditor,
    } = useUploaderOptions()
    const { openImageEditor } = useUploaderEditor()
    const { isDark: dark } = useUploaderTheme()
    const {
        upload: { filesProgressMap },
    } = useUploaderUploadControls()

    const type = file.type ?? ''
    const isImage = useMemo(() => fileGetIsImage(type), [type])
    const isVideo = useMemo(() => type.startsWith('video/'), [type])
    const isSuccessful = file.status === UploadStatus.SUCCESSFUL
    const isBusy =
        file.status === UploadStatus.UPLOADING ||
        file.status === UploadStatus.PROCESSING
    const thumb = useMemo(
        () => nonMediaThumb(type, file.name),
        [type, file.name],
    )
    const progress = useMemo(() => {
        const p = filesProgressMap[file.id]
        const loaded = p?.loaded ?? NaN
        const total = p?.total ?? NaN
        const pct = Math.floor((loaded / total) * 100)
        // No progress entry ⇒ NaN; total === 0 ⇒ Infinity. Either would render
        // width:NaN%/aria-valuenow=NaN in ProgressBar while an upload is active.
        return Number.isFinite(pct) ? pct : 0
    }, [file.id, filesProgressMap])

    return (
        <div
            className={cn(
                'upup-fx-hover-lift upup-flex upup-w-full upup-items-center upup-gap-3 upup-rounded-xl upup-px-3 upup-py-2.5 upup-ring-1',
                dark
                    ? 'upup-bg-white/[0.04] upup-ring-white/[0.07]'
                    : 'upup-bg-black/[0.04] upup-ring-black/[0.06]',
            )}
        >
            <div
                className="upup-relative upup-flex upup-h-10 upup-w-10 upup-flex-none upup-items-center upup-justify-center upup-overflow-hidden upup-rounded-[9px] upup-bg-center upup-bg-cover upup-bg-no-repeat"
                style={
                    isImage
                        ? { backgroundImage: `url(${file.url ?? ''})` }
                        : isVideo
                          ? undefined
                          : { background: thumb.gradient }
                }
            >
                {/* Real first-frame video thumbnail (no controls chrome). Uses the
                    local object URL, which persists through upload (updateFile keeps
                    `url`), so the preview survives a completed run. */}
                {isVideo && (
                    <video
                        src={file.url ?? ''}
                        muted
                        playsInline
                        preload="metadata"
                        className="upup-pointer-events-none upup-absolute upup-inset-0 upup-h-full upup-w-full upup-object-cover"
                    />
                )}
                {!isImage && !isVideo && (
                    <Icon
                        name={thumb.icon}
                        size={20}
                        className="upup-text-white"
                    />
                )}
            </div>

            <div className="upup-flex upup-min-w-0 upup-flex-1 upup-flex-col upup-gap-0.5">
                <div
                    className={cn(
                        'upup-truncate upup-text-[13px]',
                        dark ? 'upup-text-[#e2e8f0]' : 'upup-text-gray-900',
                    )}
                >
                    {file.name}
                </div>
                <div
                    className={cn(
                        'upup-text-[12px]',
                        dark ? 'upup-text-[#94a3b8]' : 'upup-text-gray-500',
                    )}
                >
                    {formatFileSize(file.size, tr)}
                </div>
                {!!progress && (
                    <ProgressBar
                        className="upup-mt-1"
                        progressBarClassName="upup-rounded"
                        progress={progress}
                        showValue
                    />
                )}
            </div>

            {/* Edit affordance for images (list view) — enabled pre/post upload,
                disabled only while the file is in flight (round-8 item 1). */}
            {isImage && imageEditor.enabled && (
                <button
                    className={cn(
                        'upup-fx-press upup-flex upup-h-8 upup-w-8 upup-flex-none upup-items-center upup-justify-center upup-rounded-lg',
                        dark
                            ? 'upup-text-[#64748b] hover:upup-bg-white/[0.06]'
                            : 'upup-text-gray-500 hover:upup-bg-black/[0.06]',
                        'disabled:upup-cursor-not-allowed disabled:upup-opacity-50',
                    )}
                    onClick={e => {
                        e.stopPropagation()
                        openImageEditor(file)
                    }}
                    type="button"
                    disabled={isBusy}
                    aria-label={tr.editImage}
                    data-testid="upup-file-edit"
                >
                    <EditIcon className="upup-h-5 upup-w-5" />
                </button>
            )}

            {isSuccessful && (
                <FileSuccessCheck
                    index={index}
                    size={22}
                    className="upup-flex-none"
                />
            )}

            {/* Once a file has uploaded successfully its delete control is gone —
                the completion check is the only trailing affordance. */}
            {!isSuccessful && (
                <button
                    className={cn(
                        'upup-fx-remove upup-fx-press upup-flex upup-h-8 upup-w-8 upup-flex-none upup-items-center upup-justify-center upup-rounded-lg',
                        dark
                            ? 'upup-text-[#64748b] hover:upup-bg-white/[0.06]'
                            : 'upup-text-gray-500 hover:upup-bg-black/[0.06]',
                        'disabled:upup-cursor-not-allowed disabled:upup-opacity-50',
                    )}
                    onClick={e => {
                        e.stopPropagation()
                        handleFileRemove(file.id)
                    }}
                    type="button"
                    disabled={!!progress}
                    aria-label={tr.removeFile}
                    data-testid="upup-file-remove"
                >
                    <FileDeleteIcon className="upup-h-5 upup-w-5" />
                </button>
            )}
        </div>
    )
})
