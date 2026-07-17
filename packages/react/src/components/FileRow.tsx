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
import { fileGetIsImage, formatFileSize } from '../lib/file'
import ProgressBar from './shared/ProgressBar'

type Props = {
    file: UploadFile
}

/**
 * Compact list-mode row (spec §4 state 3, states-tour-v2.html "multiple files").
 * A horizontal card: thumbnail · name/size · remove. The grid-mode tile
 * (FilePreview) keeps the richer affordances (edit, click-to-preview); the row
 * is the dense overview and matches the mockup exactly.
 */
export default memo(function FileRow({ file }: Props) {
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
                'upup-fx-hover-lift upup-flex upup-items-center upup-gap-3 upup-rounded-xl upup-px-3 upup-py-2.5 upup-ring-1',
                dark
                    ? 'upup-bg-white/[0.04] upup-ring-white/[0.07]'
                    : 'upup-bg-black/[0.04] upup-ring-black/[0.06]',
            )}
        >
            <div
                className="upup-flex upup-h-10 upup-w-10 upup-flex-none upup-items-center upup-justify-center upup-overflow-hidden upup-rounded-[9px] upup-bg-center upup-bg-cover upup-bg-no-repeat"
                style={
                    isImage
                        ? { backgroundImage: `url(${file.url ?? ''})` }
                        : {
                              background:
                                  'linear-gradient(135deg,#0ea5e9,#7c3aed)',
                          }
                }
            >
                {!isImage && (
                    <svg
                        viewBox="0 0 24 24"
                        width="18"
                        height="18"
                        fill="none"
                        stroke="rgba(255,255,255,0.9)"
                        strokeWidth="1.6"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        aria-hidden="true"
                    >
                        <path d="M6 3h8l4 4v13a1 1 0 0 1-1 1H6a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1z" />
                        <path d="M14 3v4h4" />
                    </svg>
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
                    />
                )}
            </div>

            <button
                className={cn(
                    'upup-fx-remove upup-fx-press upup-flex upup-h-[26px] upup-w-[26px] upup-flex-none upup-items-center upup-justify-center upup-rounded-[7px]',
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
                <FileDeleteIcon className="upup-h-[15px] upup-w-[15px]" />
            </button>
        </div>
    )
})
