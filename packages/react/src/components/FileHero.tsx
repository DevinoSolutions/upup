import React, { memo, useMemo } from 'react'
import { cn } from '@upupjs/core/internal'
import type { UploadFile } from '@upupjs/core'
import {
    useUploaderFiles,
    useUploaderI18n,
    useUploaderOptions,
    useUploaderTheme,
    useUploaderUploadControls,
} from '../context/UploaderContext'
import { fileGetExtension, fileGetIsImage, formatFileSize } from '../lib/file'
import FileIcon from './FileIcon'
import ProgressBar from './shared/ProgressBar'

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
    } = useUploaderOptions()
    const { isDark: dark } = useUploaderTheme()
    const {
        upload: { filesProgressMap },
    } = useUploaderUploadControls()

    const isImage = useMemo(() => fileGetIsImage(file.type ?? ''), [file.type])
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
            ) : (
                <div className="upup-flex upup-min-h-0 upup-flex-1 upup-items-center upup-justify-center upup-bg-gradient-to-br upup-from-[#0ea5e9]/10 upup-to-[#7c3aed]/10">
                    <FileIcon extension={extension} />
                </div>
            )}

            <button
                className={cn(
                    'upup-fx-remove upup-fx-press upup-absolute upup-right-3 upup-top-3 upup-z-10',
                    'upup-flex upup-h-[30px] upup-w-[30px] upup-items-center upup-justify-center',
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
                <FileDeleteIcon className="upup-h-[15px] upup-w-[15px]" />
            </button>

            <div className="upup-pointer-events-none upup-absolute upup-inset-x-0 upup-bottom-0 upup-bg-gradient-to-t upup-from-[#04080f]/[0.86] upup-via-[#04080f]/50 upup-to-transparent upup-px-[18px] upup-pb-3.5 upup-pt-4">
                <div className="upup-truncate upup-text-[13px] upup-font-semibold upup-text-[#e2e8f0]">
                    {file.name}
                </div>
                <div className="upup-mt-0.5 upup-text-[12px] upup-text-[#94a3b8]">
                    {formatFileSize(file.size, tr)}
                </div>
            </div>

            <ProgressBar
                className="upup-absolute upup-bottom-0 upup-left-0 upup-right-0"
                progressBarClassName="upup-rounded-none"
                progress={progress}
            />
        </div>
    )
})
