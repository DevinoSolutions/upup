'use client'

import React, {
    forwardRef,
    HTMLAttributes,
    memo,
    MouseEventHandler,
    useEffect,
    useMemo,
    useRef,
    useState,
} from 'react'
import { createPortal } from 'react-dom'
import { useUploaderContext } from '../context/uploader-context'
import { useIsClient } from '../use-is-client'
import {
    fileGetIsImage,
    fileGetIsText,
    fileGetIsVideo,
    PREVIEW_MAX_TEXT_SIZE,
    PREVIEW_TEXT_TRUNCATE_LENGTH,
} from '../lib/file'
import { cn } from '../lib/tailwind'

export default memo(
    forwardRef<
        HTMLDivElement,
        HTMLAttributes<HTMLDivElement> & {
            onStopPropagation: MouseEventHandler<HTMLDivElement>
            fileUrl: string
            fileName: string
            fileType: string
            fileSize?: number
        }
    >(function FilePreviewPortal(
        {
            onStopPropagation,
            fileUrl,
            fileName,
            fileType,
            fileSize,
            ...restProps
        },
        ref,
    ) {
        const { resolvedTheme } = useUploaderContext()
        const isClient = useIsClient()

        const isImage = useMemo(() => fileGetIsImage(fileType), [fileType])
        const isVideo = useMemo(() => fileGetIsVideo(fileType), [fileType])
        const isText = useMemo(
            () => fileGetIsText(fileType, fileName),
            [fileType, fileName],
        )
        const dialogRef = useRef<HTMLDivElement | null>(null)
        const previouslyFocusedElementRef = useRef<HTMLElement | null>(null)
        const { onKeyDown: onPortalKeyDown, ...portalProps } = restProps

        const isOversizedText = useMemo(
            () =>
                isText &&
                fileSize !== undefined &&
                fileSize > PREVIEW_MAX_TEXT_SIZE,
            [isText, fileSize],
        )

        const [textContent, setTextContent] = useState<string>('')
        const [textLoading, setTextLoading] = useState(false)
        const [textError, setTextError] = useState<string>()
        const [isTruncated, setIsTruncated] = useState(false)

        useEffect(() => {
            let cancelled = false
            const loadText = async () => {
                if (!isText) return
                try {
                    setTextLoading(true)

                    if (isOversizedText) {
                        const res = await fetch(fileUrl)
                        const reader = res.body?.getReader()
                        if (!reader) throw new Error('Cannot read file')

                        const decoder = new TextDecoder()
                        let result = ''
                        let done = false

                        while (
                            !done &&
                            result.length < PREVIEW_TEXT_TRUNCATE_LENGTH
                        ) {
                            const { value, done: streamDone } =
                                await reader.read()
                            done = streamDone
                            if (value) {
                                result += decoder.decode(value, {
                                    stream: !done,
                                })
                            }
                        }
                        reader.cancel()

                        if (!cancelled) {
                            const wasTruncated =
                                !done ||
                                result.length > PREVIEW_TEXT_TRUNCATE_LENGTH
                            if (wasTruncated) {
                                result = result.slice(
                                    0,
                                    PREVIEW_TEXT_TRUNCATE_LENGTH,
                                )
                            }
                            setIsTruncated(wasTruncated)
                            setTextContent(result)
                        }
                    } else {
                        const res = await fetch(fileUrl)
                        const txt = await res.text()
                        if (!cancelled) setTextContent(txt)
                    }
                } catch (e) {
                    if (!cancelled)
                        setTextError((e as Error)?.message || 'Preview error')
                } finally {
                    if (!cancelled) setTextLoading(false)
                }
            }
            loadText()
            return () => {
                cancelled = true
            }
        }, [fileUrl, isText, isOversizedText])

        useEffect(() => {
            previouslyFocusedElementRef.current =
                document.activeElement instanceof HTMLElement
                    ? document.activeElement
                    : null

            const dialog = dialogRef.current
            if (!dialog) return

            const focusableElements = dialog.querySelectorAll<HTMLElement>(
                [
                    'button:not([disabled])',
                    '[href]',
                    'input:not([disabled])',
                    'select:not([disabled])',
                    'textarea:not([disabled])',
                    '[tabindex]:not([tabindex="-1"])',
                ].join(','),
            )

            const initialFocusTarget = focusableElements[0] ?? dialog
            initialFocusTarget.focus()

            return () => {
                previouslyFocusedElementRef.current?.focus()
            }
        }, [])

        const handleKeyDown: React.KeyboardEventHandler<HTMLDivElement> = e => {
            onPortalKeyDown?.(e)
            if (e.defaultPrevented) return

            if (e.key === 'Escape') {
                e.preventDefault()
                dialogRef.current?.click()
                return
            }

            if (e.key !== 'Tab') return

            const dialog = dialogRef.current
            if (!dialog) return

            const focusableElements = Array.from(
                dialog.querySelectorAll<HTMLElement>(
                    [
                        'button:not([disabled])',
                        '[href]',
                        'input:not([disabled])',
                        'select:not([disabled])',
                        'textarea:not([disabled])',
                        '[tabindex]:not([tabindex="-1"])',
                    ].join(','),
                ),
            )

            if (!focusableElements.length) {
                e.preventDefault()
                dialog.focus()
                return
            }

            const firstFocusable = focusableElements[0]
            const lastFocusable =
                focusableElements[focusableElements.length - 1]

            if (e.shiftKey && document.activeElement === firstFocusable) {
                e.preventDefault()
                lastFocusable.focus()
            } else if (
                !e.shiftKey &&
                document.activeElement === lastFocusable
            ) {
                e.preventDefault()
                firstFocusable.focus()
            }
        }

        // SSR-safe: don't render portals on the server
        if (!isClient) return null

        return createPortal(
            <div className="upup-scope">
                <div
                    className="upup-fixed upup-inset-0 upup-z-[2147483647] upup-flex upup-items-center upup-justify-center upup-bg-black/40"
                    {...portalProps}
                    ref={node => {
                        dialogRef.current = node
                        if (typeof ref === 'function') {
                            ref(node)
                        } else if (ref) {
                            ref.current = node
                        }
                    }}
                    role="dialog"
                    aria-modal="true"
                    aria-label={`${fileName} preview`}
                    tabIndex={-1}
                    onKeyDown={handleKeyDown}
                >
                    <div className="upup-relative upup-h-[90vh] upup-w-[90vw] upup-p-4">
                        <div
                            className="upup-absolute upup-inset-0 upup-m-4"
                            style={{ backgroundColor: 'var(--upup-color-surface)' }}
                            data-upup-slot="filePreviewPortal.root"
                            onClick={onStopPropagation}
                        >
                            {isImage && (
                                <img
                                    src={fileUrl}
                                    alt={fileName}
                                    className="upup-h-full upup-w-full upup-rounded upup-object-contain"
                                />
                            )}
                            {!isImage && isVideo && (
                                <video
                                    src={fileUrl}
                                    controls
                                    playsInline
                                    className="upup-h-full upup-w-full upup-rounded upup-object-contain"
                                />
                            )}
                            {!isImage && !isVideo && (
                                <>
                                    {isText ? (
                                        <div className="upup-h-full upup-w-full upup-overflow-auto upup-p-4 upup-font-mono upup-text-xs">
                                            {textLoading && <p>Loading…</p>}
                                            {textError && (
                                                <p>Preview error: {textError}</p>
                                            )}
                                            {!textLoading && !textError && (
                                                <>
                                                    <pre className="upup-whitespace-pre-wrap">
                                                        {textContent}
                                                    </pre>
                                                    {isTruncated && (
                                                        <div className="upup-mt-4 upup-rounded upup-border upup-border-yellow-500/30 upup-bg-yellow-500/10 upup-px-3 upup-py-2 upup-text-xs upup-text-yellow-400">
                                                            Content truncated —
                                                            file is too large to
                                                            preview in full.
                                                        </div>
                                                    )}
                                                </>
                                            )}
                                        </div>
                                    ) : (
                                        <object
                                            data={fileUrl}
                                            width="100%"
                                            height="100%"
                                            name={fileName}
                                            type={fileType}
                                        >
                                            <p>Loading…</p>
                                        </object>
                                    )}
                                </>
                            )}
                        </div>
                    </div>
                </div>
            </div>,
            document.body,
        )
    }),
)
