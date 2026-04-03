'use client'

import React, { useMemo } from 'react'
import { UploadStatus } from '@upup/shared'
import { useUploaderContext } from '../../context/uploader-context'

type Props = {
    handleCancel(): void
}

export default function MainBoxHeader({ handleCancel }: Readonly<Props>) {
    const {
        files,
        status,
        mini,
        icons,
        setActiveSource,
        t,
    } = useUploaderContext()

    const isUploading = status === UploadStatus.UPLOADING
    const fileCount = files.length
    const ContainerAddMoreIcon = icons.ContainerAddMoreIcon

    if (mini) return null

    return (
        <div
            className="upup-shadow-bottom upup-left-0 upup-right-0 upup-top-0 upup-z-10 upup-grid upup-grid-cols-4 upup-grid-rows-2 upup-items-center upup-justify-between upup-rounded-t-lg upup-px-3 upup-py-2 md:upup-grid-rows-1"
            style={{ backgroundColor: 'var(--upup-color-surface-alt)' }}
            data-upup-slot="fileList.header"
        >
            <button
                className="upup-max-md upup-col-start-1 upup-col-end-3 upup-row-start-2 upup-p-1 upup-text-left upup-text-sm md:upup-col-end-2 md:upup-row-start-1"
                style={{ color: 'var(--upup-color-primary)' }}
                onClick={handleCancel}
                disabled={isUploading}
                data-upup-slot="fileList.cancelButton"
            >
                {t('header.removeAllFiles')}
            </button>
            <span
                className="upup-col-span-4 upup-text-center upup-text-sm md:upup-col-span-2"
                style={{ color: 'var(--upup-color-text-muted)' }}
                aria-live="polite"
                data-upup-slot="fileList.fileCount"
            >
                {t('header.filesSelected', { count: fileCount })}
            </span>
            {ContainerAddMoreIcon && (
                <button
                    className="upup-col-start-3 upup-col-end-5 upup-flex upup-items-center upup-justify-end upup-gap-1 upup-rounded-md upup-border upup-border-dashed upup-px-2 upup-py-1 upup-text-sm md:upup-col-start-4"
                    style={{
                        color: 'var(--upup-color-primary)',
                        borderColor: 'var(--upup-color-border-active)',
                    }}
                    onClick={() => setActiveSource(null)}
                    disabled={isUploading}
                >
                    <ContainerAddMoreIcon /> {t('header.addMore')}
                </button>
            )}
        </div>
    )
}
