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
import { useRootContext } from '../context/RootContext'
import {
    fileGetIsImage,
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
            fileUrl: string
            fileName: string
            fileType: string
            fileSize?: number
        }
    >(function FilePreviewPortal(
        { onStopPropagation, fileUrl, fileName, fileType, fileSize, ...restProps },
        ref,
    ) {
        const {
            props: { dark, classNames },
        } = useRootContext()
        const isImage = useMemo(() => fileGetIsImage(fileType), [fileType])
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

                        while (!done && result.length < PREVIEW_TEXT_TRUNCATE_LENGTH) {
                            const { value, done: streamDone } = await reader.read()
                            done = streamDone
                            if (value) {
                                result += decoder.decode(value, { stream: !done })
                            }
                        }
                        reader.cancel()

                        if (!cancelled) {
                            const wasTruncated =
                                !done || result.length > PREVIEW_TEXT_TRUNCATE_LENGTH
                            if (wasTruncated) {
                                result = result.slice(0, PREVIEW_TEXT_TRUNCATE_LENGTH)
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
            <div
                className="upup-fixed upup-inset-0 upup-z-[2147483647] upup-flex upup-items-center upup-justify-center upup-bg-black/40"
                ref={ref}
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
                            classNames.filePreviewPortal,
                        )}
                        onClick={onStopPropagation}
                    >
                        <ShouldRender if={isImage}>
                            <img
                                src={fileUrl}
                                alt={fileName}
                                className="upup-h-full upup-w-full upup-rounded upup-object-contain"
                            />
                        </ShouldRender>
                        <ShouldRender if={!isImage}>
                            <ShouldRender if={isText}>
                                <div className="upup-h-full upup-w-full upup-overflow-auto upup-p-4 upup-font-mono upup-text-xs">
                                    {textLoading && <p>Loading...</p>}
                                    {textError && <p>Error: {textError}</p>}
                                    {!textLoading && !textError && (
                                        <>
                                            <pre className="upup-whitespace-pre-wrap">
                                                {textContent}
                                            </pre>
                                            {isTruncated && (
                                                <div className="upup-mt-4 upup-rounded upup-border upup-border-yellow-500/30 upup-bg-yellow-500/10 upup-px-3 upup-py-2 upup-text-xs upup-text-yellow-400">
                                                    Content truncated — file is too large to preview in full.
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
                                    <p>Loading...</p>
                                </object>
                            </ShouldRender>
                        </ShouldRender>
                    </div>
                </div>
            </div>,
            document.body,
        )
    }),
)
