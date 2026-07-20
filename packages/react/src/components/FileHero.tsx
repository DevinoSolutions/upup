import React, { memo, useMemo } from 'react'
import { cn } from '@upupjs/core/internal'
import { UploadStatus, type UploadFile } from '@upupjs/core'
import {
    useUploaderEditor,
    useUploaderFiles,
    useUploaderI18n,
    useUploaderOptions,
    useUploaderTheme,
    useUploaderUploadControls,
} from '../context/UploaderContext'
import { fileGetExtension, fileGetIsImage, formatFileSize } from '../lib/file'
import FileIcon from './FileIcon'
import ProgressBar from './shared/ProgressBar'
import FileSuccessCheck from './shared/FileSuccessCheck'
import EditIcon from './shared/EditIcon'

type Props = {
    file: UploadFile
}

/**
 * Single-file HERO preview (spec §4 state 3, states-tour-v2.html "single file").
 * One visual fills the fixed-height content area with a bottom scrim caption.
 * The panel is fixed-height by ruling, so the media MUST stay bounded with
 * `min-h-0 flex-1 object-contain` — the repo's #1 visual trap.
 */
export default memo(function FileHero({ file }: Props) {
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

    const isSuccessful = file.status === UploadStatus.SUCCESSFUL
    const isBusy =
        file.status === UploadStatus.UPLOADING ||
        file.status === UploadStatus.PROCESSING
    const isImage = useMemo(() => fileGetIsImage(file.type ?? ''), [file.type])
    const isVideo = useMemo(
        () => (file.type ?? '').startsWith('video/'),
        [file.type],
    )
    const extension = useMemo(
        () => fileGetExtension(file.type ?? '', file.name),
        [file.type, file.name],
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
            data-testid="upup-file-hero"
            data-upup-slot="file-hero"
            role="listitem"
            className={cn(
                'upup-relative upup-flex upup-min-h-0 upup-flex-1 upup-flex-col upup-overflow-hidden upup-rounded-2xl upup-ring-1',
                dark
                    ? 'upup-bg-white/[0.03] upup-ring-white/[0.08]'
                    : 'upup-bg-black/[0.04] upup-ring-black/[0.06]',
            )}
        >
            {isImage ? (
                <img
                    src={file.url ?? ''}
                    alt={file.name}
                    className="upup-min-h-0 upup-flex-1 upup-object-contain"
                />
            ) : isVideo ? (
                // preload="metadata" paints the first frame — a real thumbnail
                // without controls chrome. Muted + playsInline keep mobile
                // browsers from hijacking it into a player.
                <video
                    src={file.url ?? ''}
                    muted
                    playsInline
                    preload="metadata"
                    className="upup-pointer-events-none upup-min-h-0 upup-flex-1 upup-object-contain"
                />
            ) : (
                <div className="upup-flex upup-min-h-0 upup-flex-1 upup-items-center upup-justify-center upup-bg-gradient-to-br upup-from-[#0ea5e9]/10 upup-to-[#7c3aed]/10">
                    <FileIcon extension={extension} />
                </div>
            )}

            {file.status === UploadStatus.SUCCESSFUL && (
                <FileSuccessCheck className="upup-absolute upup-left-3 upup-top-3 upup-z-10" />
            )}

            {/* Delete is gone once the file has uploaded successfully — the
                completion check (top-left) is the only remaining overlay mark. */}
            {file.status !== UploadStatus.SUCCESSFUL && (
                <button
                    className={cn(
                        'upup-fx-remove upup-fx-press upup-absolute upup-right-3 upup-top-3 upup-z-10',
                        'upup-flex upup-h-[34px] upup-w-[34px] upup-items-center upup-justify-center',
                        'upup-rounded-[9px] upup-bg-[#04080f]/40 upup-text-[#e2e8f0]',
                        'hover:upup-bg-[#04080f]/65',
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

            {/* Edit affordance for images (single-file hero) — pre/post upload;
                sits left of the trash, and slides to the trash's slot once the
                file is done and the trash is gone (round-8 item 1). */}
            {isImage && imageEditor.enabled && (
                <button
                    className={cn(
                        'upup-fx-press upup-absolute upup-top-3 upup-z-10',
                        isSuccessful ? 'upup-right-3' : 'upup-right-[54px]',
                        'upup-flex upup-h-[34px] upup-w-[34px] upup-items-center upup-justify-center',
                        'upup-rounded-[9px] upup-bg-[#04080f]/40 upup-text-[#e2e8f0]',
                        'hover:upup-bg-[#04080f]/65',
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

            {/* Caption scrim: theme-aware (a black scrim over a light hero read
                as a dark-mode leak). The progress bar lives INSIDE the scrim
                flow so it can never overlap the name/size lines. */}
            <div
                className={cn(
                    'upup-pointer-events-none upup-absolute upup-inset-x-0 upup-bottom-0 upup-bg-gradient-to-t upup-to-transparent upup-px-[18px] upup-pb-3.5 upup-pt-4',
                    dark
                        ? 'upup-from-[#04080f]/[0.86] upup-via-[#04080f]/50'
                        : 'upup-from-white/[0.92] upup-via-white/60',
                )}
            >
                <div
                    className={cn(
                        'upup-truncate upup-text-[13px] upup-font-semibold',
                        dark ? 'upup-text-[#e2e8f0]' : 'upup-text-[#1e293b]',
                    )}
                >
                    {file.name}
                </div>
                <div
                    className={cn(
                        'upup-mt-0.5 upup-text-[12px]',
                        dark ? 'upup-text-[#94a3b8]' : 'upup-text-[#64748b]',
                    )}
                >
                    {formatFileSize(file.size, tr)}
                </div>
                <ProgressBar
                    className={cn(
                        'upup-mt-2',
                        dark ? 'upup-text-white' : 'upup-text-[#0f172a]',
                    )}
                    progressBarClassName="upup-rounded"
                    progress={progress}
                    showValue
                />
            </div>
        </div>
    )
})
