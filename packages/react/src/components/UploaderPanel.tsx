import React, { useEffect, useRef } from 'react'
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
import { cn } from '@upupjs/core/internal'
import { UploadStatus } from '@upupjs/core'
import SourceSelector from './SourceSelector'
import SourceView from './SourceView'
import FileList from './FileList'
export default function UploaderPanel(): React.ReactElement | null {
    const { files } = useUploaderFiles()
    const { activeSource } = useUploaderSource()
    const { sourceOverlayOpen, sourceOverlayClosing } = useUploaderView()
    const { isOnline, motionMode } = useUploaderRuntime()
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

    // The dashed dropzone frame is the idle-view affordance: shown only when the
    // panel is an empty, at-rest dropzone (no active source, no add-more flow, no
    // files). It supersedes the old pulsing CSS border — the CSS border is kept
    // for the file-present states, so we suppress it whenever the frame is shown.
    const showDropzoneFrame =
        absoluteHasBorder && !activeSource && !sourceOverlayOpen && !files.size

    // The add-more overlay: once files exist, the source surface (selector, or a
    // chosen source's view) slides up over the still-mounted, dimmed file list.
    // With no files the same surface is the panel's primary content instead.
    // It stays mounted through the reverse close-slide (`sourceOverlayClosing`).
    const hasFiles = files.size > 0
    const sourceSurface = activeSource ? <SourceView /> : <SourceSelector />
    const showSourceOverlay =
        hasFiles &&
        (sourceOverlayOpen || sourceOverlayClosing || !!activeSource)

    // Move focus into the overlay when it opens (or when its inner view swaps)
    // so keyboard/SR users don't land on the inert list underneath. Minimal —
    // no focus trap; the dimmed list is `inert` so Tab can't reach it anyway.
    const overlayRef = useRef<HTMLDivElement>(null)
    useEffect(() => {
        if (sourceOverlayOpen || activeSource) {
            overlayRef.current
                ?.querySelector<HTMLElement>('button:not([disabled])')
                ?.focus()
        }
    }, [sourceOverlayOpen, activeSource])

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
            data-motion={motionMode}
            role="region"
            aria-label={tr.dropzoneLabel}
            {...dropEffectProps}
            className={cn(
                'upup-relative upup-flex-1 upup-overflow-hidden upup-rounded-lg',
                {
                    // Solid/dashed CSS border stays for the file-present states;
                    // the idle dropzone uses the animated SVG frame instead.
                    'upup-border upup-border-[#0ea5e9]':
                        absoluteHasBorder && !showDropzoneFrame,
                    'upup-border-[#38bdf8] dark:upup-border-[#38bdf8]':
                        absoluteHasBorder && !showDropzoneFrame && dark,
                    'upup-border-dashed': !isDragging && !showDropzoneFrame,
                    'upup-bg-[#e0f2fe] upup-backdrop-blur-sm':
                        absoluteIsDragging && !dark,
                    'upup-bg-[#0b2a3a] upup-backdrop-blur-sm dark:upup-bg-[#0b2a3a]':
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
                        'upup-absolute upup-inset-x-0 upup-top-0 upup-z-30 upup-px-3 upup-py-1.5 upup-text-center upup-text-xs upup-font-medium upup-text-white upup-bg-yellow-500',
                        { 'upup-bg-yellow-600': dark },
                    )}
                >
                    No internet connection — uploads will resume when you
                    reconnect.
                </div>
            )}
            {showDropzoneFrame && (
                <svg
                    data-upup-slot="dropzone-frame"
                    aria-hidden="true"
                    className="upup-pointer-events-none upup-absolute upup-inset-3"
                >
                    <rect
                        x="1"
                        y="1"
                        rx="14"
                        ry="14"
                        fill="none"
                        strokeWidth="1.5"
                        strokeDasharray="6 6"
                        stroke={
                            absoluteIsDragging
                                ? 'rgba(56,189,248,0.6)'
                                : 'rgba(56,189,248,0.22)'
                        }
                        // Marches continuously; the shared `[data-motion='off']`
                        // kill rule (which now also gates `upup-animate-fx-*`) makes
                        // it static when motion is off.
                        className="upup-animate-fx-dash-march"
                        style={{
                            width: 'calc(100% - 2px)',
                            height: 'calc(100% - 2px)',
                        }}
                    />
                </svg>
            )}
            {/* Idle primary: the source surface fills the panel when empty. */}
            {!hasFiles && sourceSurface}
            {/* Add-more overlay: the source surface slides up over the dimmed,
                still-mounted file list — nothing unmounts, no state is lost. */}
            {showSourceOverlay && (
                <div
                    ref={overlayRef}
                    data-upup-slot="source-overlay"
                    role="dialog"
                    aria-modal="true"
                    aria-label={tr.addingMoreFiles}
                    className={cn(
                        'upup-absolute upup-inset-0 upup-z-20 upup-flex upup-flex-col upup-overflow-hidden upup-rounded-lg upup-ring-1 upup-ring-inset',
                        sourceOverlayClosing
                            ? 'upup-fx-overlay-close-slide'
                            : 'upup-fx-overlay-slide',
                        dark
                            ? 'upup-bg-[#0b1220]/95 upup-ring-white/[0.06]'
                            : 'upup-bg-white/95 upup-ring-black/[0.06]',
                    )}
                >
                    {sourceSurface}
                </div>
            )}
            <FileList />
        </div>
    )
}
