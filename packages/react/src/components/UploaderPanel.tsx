import React, { useEffect, useRef } from 'react'
import {
    useUploaderFiles,
    useUploaderI18n,
    useUploaderOptions,
    useUploaderRuntime,
    useUploaderSource,
    useUploaderTheme,
    useUploaderUploadControls,
    useUploaderView,
} from '../context/UploaderContext'
import { devinoDark, devinoLight, logoDark, logoLight } from '../assets/logos'
import useUploaderPanel from '../hooks/useUploaderPanel'
import { cn } from '@upupjs/core/internal'
import { UploadStatus, formatUiMessage } from '@upupjs/core'
import SourceSelector from './SourceSelector'
import SourceView from './SourceView'
import FileList from './FileList'
export default function UploaderPanel(): React.ReactElement | null {
    const { files } = useUploaderFiles()
    const { activeSource } = useUploaderSource()
    const {
        sourceOverlayOpen,
        sourceOverlayClosing,
        dropRejected,
        closeSourceOverlay,
    } = useUploaderView()
    const { isOnline, motionMode } = useUploaderRuntime()
    const { translations: tr } = useUploaderI18n()
    const { isDark: dark } = useUploaderTheme()
    const { mini, showBranding } = useUploaderOptions()
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

    // Focus management (minimal — no focus trap; the dimmed list is `inert`).
    // On open (or an inner view swap) pull focus into the overlay so keyboard/SR
    // users don't land on the inert list underneath, capturing the element that
    // triggered it. Skips the closing phase (open/activeSource both false there)
    // so the departing overlay never steals focus back.
    const overlayRef = useRef<HTMLDivElement>(null)
    const triggerRef = useRef<HTMLElement | null>(null)
    // Sheet swipe-to-dismiss state (refs — dragging must not re-render).
    const swipeStartYRef = useRef<number | null>(null)
    const swipedRef = useRef(false)
    useEffect(() => {
        if (!(sourceOverlayOpen || activeSource)) return
        const overlayEl = overlayRef.current
        if (!overlayEl) return
        if (
            !triggerRef.current &&
            document.activeElement instanceof HTMLElement
        )
            triggerRef.current = document.activeElement
        overlayEl.querySelector<HTMLElement>('button:not([disabled])')?.focus()
    }, [sourceOverlayOpen, activeSource])
    // When the overlay fully settles closed (past the reverse slide), restore
    // focus to the trigger if it's still in the document.
    useEffect(() => {
        if (sourceOverlayOpen || sourceOverlayClosing || activeSource) return
        const trigger = triggerRef.current
        if (!trigger) return
        triggerRef.current = null
        if (trigger.isConnected) trigger.focus()
    }, [sourceOverlayOpen, sourceOverlayClosing, activeSource])

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
                'upup-relative upup-flex upup-flex-1 upup-flex-col upup-overflow-hidden upup-rounded-lg',
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
            {/* Drop-rejection toast: a file was dropped onto a read-only drive
                picker (core DragDropController → transient-UI store). Auto-clears
                after the store's 3s window drives an unmount — no JS timer here. */}
            {dropRejected && (
                <div
                    data-testid="upup-drop-rejected-toast"
                    data-upup-slot="drop-rejected-toast"
                    role="status"
                    aria-live="polite"
                    className={cn(
                        'upup-animate-informer-in upup-absolute upup-inset-x-4 upup-top-4 upup-z-30 upup-flex upup-items-center upup-gap-2.5 upup-rounded-xl upup-px-3.5 upup-py-2.5 upup-text-[13px] upup-leading-snug upup-ring-1',
                        dark
                            ? 'upup-bg-rose-500/[0.14] upup-text-rose-200 upup-ring-rose-400/30'
                            : 'upup-bg-rose-50 upup-text-rose-700 upup-ring-rose-300/60',
                    )}
                >
                    <svg
                        viewBox="0 0 24 24"
                        width="16"
                        height="16"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="1.9"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        aria-hidden="true"
                        className="upup-flex-none"
                    >
                        <circle cx="12" cy="12" r="9" />
                        <path d="M12 8v4" />
                        <path d="M12 16h.01" />
                    </svg>
                    <span>
                        {formatUiMessage(tr.dropRejected, {
                            provider: dropRejected,
                        })}
                    </span>
                </div>
            )}
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
                    // An <svg> is a replaced element: absolute insets position it
                    // but do NOT stretch it (it keeps the 300x150 default), so the
                    // frame needs its size stated explicitly alongside inset-3.
                    className="upup-pointer-events-none upup-absolute upup-inset-3 upup-h-[calc(100%-1.5rem)] upup-w-[calc(100%-1.5rem)]"
                >
                    <rect
                        x="1"
                        y="1"
                        rx="14"
                        ry="14"
                        fill="none"
                        strokeWidth="1.5"
                        // 24px period (10 dash + 14 gap) — the fx-dash-march
                        // keyframe shifts stroke-dashoffset by exactly -24, so
                        // the marching loop stays seamless.
                        strokeDasharray="10 14"
                        stroke={
                            dark
                                ? absoluteIsDragging
                                    ? 'rgba(56,189,248,0.65)'
                                    : 'rgba(56,189,248,0.35)'
                                : absoluteIsDragging
                                  ? 'rgba(2,132,199,0.7)'
                                  : 'rgba(2,132,199,0.4)'
                        }
                        // The dashes rest at idle and march only while a drag is
                        // over the panel (interaction state, not a motion-pref
                        // gate — the `[data-motion='off']` kill rule still stops
                        // the march entirely when motion is off).
                        className={cn(
                            absoluteIsDragging && 'upup-animate-fx-dash-march',
                        )}
                        style={{
                            width: 'calc(100% - 2px)',
                            height: 'calc(100% - 2px)',
                        }}
                    />
                </svg>
            )}
            {/* Drag-over prompt: an explicit "drop it here" affordance (icon +
                text) so the drag state never reads as a mere glow. Pointer
                events pass through — the panel underneath owns the drop. */}
            {absoluteIsDragging && (
                <div
                    data-testid="upup-drag-overlay"
                    data-upup-slot="drag-overlay"
                    aria-hidden="true"
                    className={cn(
                        'upup-animate-fx-view upup-pointer-events-none upup-absolute upup-inset-0 upup-z-10 upup-flex upup-flex-col upup-items-center upup-justify-center upup-gap-3',
                        dark ? 'upup-bg-[#0b1220]/70' : 'upup-bg-white/70',
                    )}
                >
                    <span
                        className={cn(
                            'upup-flex upup-h-16 upup-w-16 upup-items-center upup-justify-center upup-rounded-2xl',
                            dark
                                ? 'upup-bg-[#38bdf8]/15 upup-text-[#38bdf8]'
                                : 'upup-bg-[#0284c7]/10 upup-text-[#0284c7]',
                        )}
                    >
                        <svg
                            viewBox="0 0 24 24"
                            width="30"
                            height="30"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="1.8"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            aria-hidden="true"
                        >
                            <path d="M12 4v11" />
                            <path d="m7 10 5 5 5-5" />
                            <path d="M4 17v1a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-1" />
                        </svg>
                    </span>
                    <span
                        className={cn(
                            'upup-text-[15px] upup-font-semibold',
                            dark
                                ? 'upup-text-[#e2e8f0]'
                                : 'upup-text-[#0f172a]',
                        )}
                    >
                        {tr.dropToUpload}
                    </span>
                </div>
            )}
            {/* Content area (source surface / file list) flexes above the
                in-panel branding row so the dashed frame — inset-3 of this
                panel — wraps EVERYTHING including the brand, per the mock. */}
            <div className="upup-relative upup-flex upup-min-h-0 upup-flex-1 upup-flex-col">
                {/* Idle primary: the source surface fills the panel when empty. */}
                {!hasFiles && sourceSurface}
                <FileList />
            </div>
            {/* Add-more DRAWER (states-tour-v2 sheet): the source surface slides
                up as a translucent bottom sheet over the dimmed, still-mounted
                file list — the files stay visible behind it so nothing feels
                lost. Swipe the grip down (or Escape / the grip click) to close. */}
            {showSourceOverlay && (
                <div
                    ref={overlayRef}
                    data-upup-slot="source-overlay"
                    // Modality applies only while the overlay is the live surface.
                    // During the reverse close-slide it's departing (the list has
                    // already un-dimmed/un-inerted), so drop the dialog role +
                    // aria-modal and let pointer events fall through to the list —
                    // otherwise AT/pointer briefly see two live surfaces.
                    role={sourceOverlayClosing ? undefined : 'dialog'}
                    aria-modal={sourceOverlayClosing ? undefined : 'true'}
                    aria-label={tr.addingMoreFiles}
                    onKeyDown={e => {
                        if (e.key === 'Escape' && !sourceOverlayClosing)
                            closeSourceOverlay()
                    }}
                    className={cn(
                        'upup-absolute upup-inset-x-3 upup-bottom-3 upup-top-11 upup-z-20 upup-flex upup-flex-col upup-overflow-hidden upup-rounded-2xl upup-ring-1 upup-ring-inset upup-backdrop-blur-md',
                        sourceOverlayClosing
                            ? 'upup-fx-overlay-close-slide upup-pointer-events-none'
                            : 'upup-fx-overlay-slide',
                        dark
                            ? 'upup-bg-[#0b1220]/[0.85] upup-ring-white/[0.08] upup-shadow-[0_-18px_40px_-18px_rgba(0,0,0,0.65)]'
                            : 'upup-bg-white/[0.85] upup-ring-black/[0.08] upup-shadow-[0_-18px_40px_-18px_rgba(15,23,42,0.25)]',
                    )}
                >
                    {/* Sheet grip: click closes; drag down past the threshold
                        closes (pointer capture — no transitionend reliance). */}
                    <button
                        type="button"
                        data-testid="upup-sheet-grip"
                        data-upup-slot="sheet-grip"
                        aria-label={tr.overlayBack}
                        onClick={() => {
                            if (!swipedRef.current) closeSourceOverlay()
                            swipedRef.current = false
                        }}
                        onPointerDown={e => {
                            swipeStartYRef.current = e.clientY
                            e.currentTarget.setPointerCapture(e.pointerId)
                        }}
                        onPointerMove={e => {
                            const startY = swipeStartYRef.current
                            const sheet = overlayRef.current
                            if (startY === null || !sheet) return
                            const dy = Math.max(0, e.clientY - startY)
                            sheet.style.transition = 'none'
                            sheet.style.transform = `translateY(${dy}px)`
                        }}
                        onPointerUp={e => {
                            const startY = swipeStartYRef.current
                            const sheet = overlayRef.current
                            swipeStartYRef.current = null
                            if (startY === null || !sheet) return
                            const dy = Math.max(0, e.clientY - startY)
                            sheet.style.transition = ''
                            sheet.style.transform = ''
                            if (dy > 72) {
                                swipedRef.current = true
                                closeSourceOverlay()
                            }
                        }}
                        className="upup-absolute upup-left-1/2 upup-top-1.5 upup-z-10 upup-flex upup-h-6 upup-w-20 upup--translate-x-1/2 upup-cursor-grab upup-touch-none upup-items-center upup-justify-center upup-rounded-full"
                    >
                        <span
                            aria-hidden="true"
                            className={cn(
                                'upup-h-1 upup-w-10 upup-rounded-full',
                                dark ? 'upup-bg-white/20' : 'upup-bg-black/20',
                            )}
                        />
                    </button>
                    {sourceSurface}
                </div>
            )}
            {/* Branding row INSIDE the panel (and the dashed frame). The
                add-more sheet slides over it, per the states-tour mock. Hidden
                while a source view is active — the drive browser / camera / url
                views own the full panel. */}
            {!mini && showBranding && !activeSource && (
                <div
                    data-testid="upup-branding"
                    className="upup-flex upup-w-full upup-flex-none upup-flex-col upup-items-center upup-justify-between upup-gap-1 upup-px-6 upup-pb-5 upup-pt-1.5 md:upup-flex-row"
                >
                    <a
                        href={'https://useupup.com/'}
                        target={'_blank'}
                        rel="noopener noreferrer"
                        className="upup-flex upup-items-center upup-gap-[5px]"
                    >
                        {dark ? (
                            <img
                                src={logoDark}
                                width={61}
                                height={13}
                                alt="logo-dark"
                            />
                        ) : (
                            <img
                                src={logoLight}
                                width={61}
                                height={13}
                                alt="logo-light"
                            />
                        )}
                    </a>
                    <a
                        href={'https://devino.ca/'}
                        target={'_blank'}
                        rel="noopener noreferrer"
                        className="upup-flex upup-flex-row upup-items-center upup-justify-end upup-gap-1"
                    >
                        <span
                            className={cn(
                                'upup-mr-0.5 upup-text-xs upup-leading-5 upup-text-[#6D6D6D] md:upup-text-sm',
                                {
                                    'upup-text-gray-300 dark:upup-text-gray-300':
                                        dark,
                                },
                            )}
                        >
                            {tr.builtBy}{' '}
                        </span>
                        {dark ? (
                            <img
                                src={devinoDark}
                                width={61}
                                height={13}
                                alt="logo-dark"
                            />
                        ) : (
                            <img
                                src={devinoLight}
                                width={61}
                                height={13}
                                alt="logo-light"
                            />
                        )}
                    </a>
                </div>
            )}
        </div>
    )
}
