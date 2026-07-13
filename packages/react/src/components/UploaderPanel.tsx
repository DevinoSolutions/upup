import React from 'react'
import {
    useUploaderFiles,
    useUploaderI18n,
    useUploaderRuntime,
    useUploaderSource,
    useUploaderTheme,
    useUploaderUploadControls,
    useUploaderView,
} from '../context/UploaderContext'
import useUploaderPanel from '../hooks/useUploaderPanel'
import { cn } from '@useupup/core/internal'
import { UploadStatus } from '@useupup/core'
import SourceSelector from './SourceSelector'
import SourceView from './SourceView'
import FileList from './FileList'
export default function UploaderPanel(): React.ReactElement | null {
    const { files } = useUploaderFiles()
    const { activeSource } = useUploaderSource()
    const { isAddingMore } = useUploaderView()
    const { isOnline } = useUploaderRuntime()
    const { translations: tr } = useUploaderI18n()
    const { isDark: dark } = useUploaderTheme()
    const {
        upload: { uploadStatus },
    } = useUploaderUploadControls()
    const {
        isDragging,
        absoluteIsDragging,
        absoluteHasBorder,
        handleDragOver,
        handleDragLeave,
        handleDrop,
        handlePaste,
    } = useUploaderPanel()

    const dropEffectProps: React.AriaAttributes = {
        // aria-dropeffect is intentionally set for drag-and-drop
        // assistive-tech feedback; still honored by current screen readers.
        'aria-dropeffect': isDragging ? 'copy' : 'none',
    }

    // Polite screen-reader announcement for upload-lifecycle transitions. It is a
    // pure projection of uploadStatus (no new event plumbing): when the status
    // flips, this text changes and assistive tech announces it via the live
    // region below. The panel itself is a non-interactive labelled region — the
    // click-to-browse affordance lives in the real buttons inside SourceSelector,
    // so no interactive element nests inside another (axe nested-interactive).
    const uploadAnnouncement =
        uploadStatus === UploadStatus.UPLOADING
            ? tr.announceUploadStarted
            : uploadStatus === UploadStatus.SUCCESSFUL
              ? tr.announceUploadComplete
              : uploadStatus === UploadStatus.FAILED
                ? tr.announceUploadFailed
                : ''

    return (
        <div
            data-testid="upup-dropzone"
            data-upup-slot="uploader-panel"
            role="region"
            aria-label={tr.dropzoneLabel}
            {...dropEffectProps}
            className={cn(
                'upup-relative upup-flex-1 upup-overflow-hidden upup-rounded-lg',
                {
                    'upup-border upup-border-[#1849D6]': absoluteHasBorder,
                    'upup-border-[#30C5F7] dark:upup-border-[#30C5F7]':
                        absoluteHasBorder && dark,
                    'upup-border-dashed': !isDragging,
                    'upup-bg-[#E7ECFC] upup-backdrop-blur-sm':
                        absoluteIsDragging && !dark,
                    'upup-bg-[#045671] upup-backdrop-blur-sm dark:upup-bg-[#045671]':
                        absoluteIsDragging && dark,
                },
            )}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            onPaste={handlePaste}
        >
            <div role="status" aria-live="polite" className="upup-sr-only">
                {uploadAnnouncement}
            </div>
            {!isOnline && (
                <div
                    className={cn(
                        'upup-absolute upup-inset-x-0 upup-top-0 upup-z-20 upup-px-3 upup-py-1.5 upup-text-center upup-text-xs upup-font-medium upup-text-white upup-bg-yellow-500',
                        { 'upup-bg-yellow-600': dark },
                    )}
                >
                    No internet connection — uploads will resume when you
                    reconnect.
                </div>
            )}
            {!!activeSource && <SourceView />}
            {!activeSource && (isAddingMore || !files.size) && (
                <SourceSelector />
            )}
            <FileList />
        </div>
    )
}
