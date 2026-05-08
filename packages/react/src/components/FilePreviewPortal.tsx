'use client'
import React, {
    forwardRef,
    HTMLAttributes,
    memo,
    MouseEventHandler,
    useEffect,
    useMemo,
    useState,
} from 'react'
import { createPortal } from 'react-dom'
import { t } from '../shared/i18n'
import { useRootContext } from '../context/RootContext'
import {
    fileGetIsImage,
    fileGetIsPdf,
    fileGetIsText,
    PREVIEW_MAX_TEXT_SIZE,
    PREVIEW_TEXT_TRUNCATE_LENGTH,
} from '../lib/file'
import { cn } from '../lib/tailwind'
import ShouldRender from './shared/ShouldRender'

export default memo(
    forwardRef<
        HTMLDivElement,
        HTMLAttributes<HTMLDivElement> & {
            onStopPropagation: MouseEventHandler<HTMLDivElement>
            onClose: () => void
            fileUrl: string
            fileName: string
            fileType: string
            fileSize?: number
        }
    >(function FilePreviewPortal(
        {
            onStopPropagation,
            onClose,
            fileUrl,
            fileName,
            fileType,
            fileSize,
            ...restProps
        },
        ref,
    ) {
        const {
            props: { isDarkTheme: dark, slotClasses },
            translations: tr,
        } = useRootContext()
        const isImage = useMemo(() => fileGetIsImage(fileType), [fileType])
        const isPdf = useMemo(() => fileGetIsPdf(fileType, fileName), [fileType, fileName])
        const isText = useMemo(
            () => fileGetIsText(fileType, fileName),
            [fileType, fileName],
        )

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
            const handleKeyDown = (event: KeyboardEvent) => {
                if (event.key === 'Escape') onClose()
            }
            window.addEventListener('keydown', handleKeyDown)
            return () => window.removeEventListener('keydown', handleKeyDown)
        }, [onClose])

        useEffect(() => {
            let cancelled = false
            const loadText = async () => {
                if (!isText) return
                try {
                    setTextLoading(true)

                    if (isOversizedText) {
                        // For large text files, only read up to PREVIEW_TEXT_TRUNCATE_LENGTH
                        // to avoid freezing the browser with massive DOM rendering
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

        return createPortal(
            <div className="upup-scope" data-upup-slot="file-preview-portal">
                <div
                    className="upup-fixed upup-inset-0 upup-z-[2147483647] upup-flex upup-items-center upup-justify-center upup-bg-black/40"
                    ref={ref}
                    role="dialog"
                    aria-modal="true"
                    aria-label={fileName}
                    onClick={onClose}
                    {...restProps}
                >
                    <div className="upup-relative upup-h-[90vh] upup-w-[90vw] upup-p-4">
                        <div
                            className={cn(
                                'upup-absolute upup-inset-0 upup-m-4 upup-bg-white',
                                {
                                    'upup-bg-[#232323] dark:upup-bg-[#232323]':
                                        dark,
                                },
                                slotClasses.filePreviewPortal,
                            )}
                            onClick={onStopPropagation}
                        >
                            <button
                                type="button"
                                aria-label={tr.cancel}
                                className="upup-absolute upup-right-3 upup-top-3 upup-z-10 upup-flex upup-size-8 upup-items-center upup-justify-center upup-rounded-full upup-bg-black/70 upup-text-sm upup-font-semibold upup-text-white upup-shadow-sm hover:upup-bg-black focus:upup-outline-none focus:upup-ring-2 focus:upup-ring-white"
                                onClick={onClose}
                            >
                                x
                            </button>
                            <ShouldRender if={isImage}>
                                <img
                                    src={fileUrl}
                                    alt={fileName}
                                    className="upup-h-full upup-w-full upup-rounded upup-object-contain"
                                />
                            </ShouldRender>
                            <ShouldRender if={isPdf}>
                                <embed
                                    src={fileUrl}
                                    type="application/pdf"
                                    width="100%"
                                    height="100%"
                                    className="upup-rounded"
                                    title={fileName}
                                />
                            </ShouldRender>
                            <ShouldRender if={!isImage && !isPdf}>
                                <ShouldRender if={isText}>
                                    <div className="upup-h-full upup-w-full upup-overflow-auto upup-p-4 upup-font-mono upup-text-xs">
                                        {textLoading && <p>{tr.loading}</p>}
                                        {textError && (
                                            <p>
                                                {t(tr.previewError, {
                                                    message: textError,
                                                })}
                                            </p>
                                        )}
                                        {!textLoading && !textError && (
                                            <>
                                                <pre className="upup-whitespace-pre-wrap">
                                                    {textContent}
                                                </pre>
                                                {isTruncated && (
                                                    <div className="upup-mt-4 upup-rounded upup-border upup-border-yellow-500/30 upup-bg-yellow-500/10 upup-px-3 upup-py-2 upup-text-xs upup-text-yellow-400">
                                                        Content truncated - file
                                                        is too large to preview
                                                        in full.
                                                    </div>
                                                )}
                                            </>
                                        )}
                                    </div>
                                </ShouldRender>
                                <ShouldRender if={!isText}>
                                    <object
                                        data={fileUrl}
                                        width="100%"
                                        height="100%"
                                        name={fileName}
                                        type={fileType}
                                    >
                                        <p>{tr.loading}</p>
                                    </object>
                                </ShouldRender>
                            </ShouldRender>
                        </div>
                    </div>
                </div>
            </div>,
            document.body,
        )
    }),
)
