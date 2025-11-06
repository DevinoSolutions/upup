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
import { fileGetIsImage } from '../lib/file'
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
        }
    >(function FilePreviewPortal(
        { onStopPropagation, fileUrl, fileName, fileType, ...restProps },
        ref,
    ) {
        const {
            props: { dark, classNames },
        } = useRootContext()
        const isImage = useMemo(() => fileGetIsImage(fileType), [fileType])
        const isText = useMemo(() => {
            if (!fileType) return false
            if (fileType.startsWith('text/')) return true
            const lower = fileName.toLowerCase()
            return (
                lower.endsWith('.txt') ||
                lower.endsWith('.md') ||
                lower.endsWith('.json') ||
                lower.endsWith('.csv') ||
                lower.endsWith('.log') ||
                lower.endsWith('.js') ||
                lower.endsWith('.ts') ||
                lower.endsWith('.css') ||
                lower.endsWith('.html')
            )
        }, [fileType, fileName])

        const [textContent, setTextContent] = useState<string>('')
        const [textLoading, setTextLoading] = useState(false)
        const [textError, setTextError] = useState<string>()

        useEffect(() => {
            let cancelled = false
            const loadText = async () => {
                if (!isText) return
                try {
                    setTextLoading(true)
                    const res = await fetch(fileUrl)
                    const txt = await res.text()
                    if (!cancelled) setTextContent(txt)
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
        }, [fileUrl, isText])

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
                                        <pre className="upup-whitespace-pre-wrap">
                                            {textContent}
                                        </pre>
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
