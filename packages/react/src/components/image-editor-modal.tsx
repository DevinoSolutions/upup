'use client'

import React, {
    ComponentType,
    memo,
    useCallback,
    useEffect,
    useMemo,
    useRef,
    useState,
} from 'react'
import { createPortal } from 'react-dom'
import type { UploadFile } from '@upup/shared'
import { useUploaderContext } from '../context/uploader-context'
import { useIsClient } from '../use-is-client'
import {
    getFilerobotTheme,
    getImageEditorCssOverrides,
} from '../lib/image-editor-helpers'
import { cn } from '../lib/tailwind'

type Props = {
    file: UploadFile
    onClose: () => void
    onSave: (editedImageData: string, mimeType?: string) => void
}

type FilerobotImageState = {
    imageBase64?: string
    fullName?: string
    mimeType?: string
    width?: number
    height?: number
}

type FilerobotDesignState = Record<string, unknown>

type FilerobotEditorProps = {
    source: string
    savingPixelRatio?: number
    previewPixelRatio?: number
    onSave?: (
        imageData: FilerobotImageState,
        designState: FilerobotDesignState,
    ) => void
    onClose?: () => void
    onBeforeSave?: (imageData: FilerobotImageState) => boolean | void
    tabsIds?: unknown[]
    defaultTabId?: unknown
    [key: string]: unknown
}

const FILEROBOT_CUSTOM_PROPS = new Set([
    'active',
    'noMargin',
    'showBackButton',
    'isPhoneScreen',
    'showTabsDrawer',
    'hasChildren',
    'isAccordion',
])

function EditorWrapper({
    children,
    StyleSheetMgr,
    shouldForwardProp,
}: {
    children: React.ReactNode
    StyleSheetMgr: ComponentType<{
        shouldForwardProp?: (prop: string) => boolean
        children: React.ReactNode
    }> | null
    shouldForwardProp: (prop: string) => boolean
}) {
    if (StyleSheetMgr) {
        return (
            <StyleSheetMgr shouldForwardProp={shouldForwardProp}>
                {children}
            </StyleSheetMgr>
        )
    }
    return <>{children}</>
}

/**
 * Accessible modal for the image editor, rendered via portal.
 * Lazy-loads `react-filerobot-image-editor` at runtime (optional peer dep).
 * SSR-safe: portal is only created on the client.
 */
export default memo(function ImageEditorModal(props: Props) {
    const { file, onClose, onSave } = props
    const { dark } = useUploaderContext()
    const isClient = useIsClient()

    const overlayRef = useRef<HTMLDivElement>(null)
    const previousFocusRef = useRef<Element | null>(null)

    const [EditorComponent, setEditorComponent] =
        useState<ComponentType<FilerobotEditorProps> | null>(null)
    const [editorConstants, setEditorConstants] = useState<{
        TABS: Record<string, unknown>
        TOOLS: Record<string, unknown>
    } | null>(null)
    const [loadError, setLoadError] = useState<string | null>(null)
    const [StyleSheetMgr, setStyleSheetMgr] = useState<ComponentType<{
        shouldForwardProp?: (prop: string) => boolean
        children: React.ReactNode
    }> | null>(null)

    useEffect(() => {
        if (typeof window === 'undefined') return

        let cancelled = false
        ;(async () => {
            try {
                const [mod, scMod] = await Promise.all([
                    import('react-filerobot-image-editor'),
                    import('styled-components').catch(() => null),
                ])
                if (cancelled) return
                setEditorComponent(
                    () => mod.default as ComponentType<FilerobotEditorProps>,
                )
                setEditorConstants({
                    TABS: (mod as Record<string, unknown>).TABS as Record<
                        string,
                        unknown
                    >,
                    TOOLS: (mod as Record<string, unknown>).TOOLS as Record<
                        string,
                        unknown
                    >,
                })
                if (scMod?.StyleSheetManager) {
                    setStyleSheetMgr(
                        () =>
                            scMod.StyleSheetManager as ComponentType<{
                                shouldForwardProp?: (prop: string) => boolean
                                children: React.ReactNode
                            }>,
                    )
                }
            } catch {
                if (cancelled) return
                setLoadError(
                    'Image editor failed to load. Make sure "react-filerobot-image-editor" is installed.',
                )
            }
        })()

        return () => {
            cancelled = true
        }
    }, [])

    useEffect(() => {
        previousFocusRef.current = document.activeElement
        return () => {
            if (previousFocusRef.current instanceof HTMLElement) {
                previousFocusRef.current.focus()
            }
        }
    }, [])

    useEffect(() => {
        overlayRef.current?.focus()
    }, [])

    const handleKeyDown = useCallback(
        (e: React.KeyboardEvent) => {
            if (e.key === 'Escape') {
                e.stopPropagation()
                onClose()
            }

            if (e.key === 'Tab') {
                const focusable =
                    overlayRef.current?.querySelectorAll<HTMLElement>(
                        'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])',
                    )
                if (!focusable || focusable.length === 0) return
                const first = focusable[0]
                const last = focusable[focusable.length - 1]

                if (e.shiftKey) {
                    if (document.activeElement === first) {
                        e.preventDefault()
                        last.focus()
                    }
                } else {
                    if (document.activeElement === last) {
                        e.preventDefault()
                        first.focus()
                    }
                }
            }
        },
        [onClose],
    )

    const handleContentClick = useCallback(
        (e: React.MouseEvent) => e.stopPropagation(),
        [],
    )

    const handleEditorSave = useCallback(
        (imageData: FilerobotImageState) => {
            if (!imageData.imageBase64) return
            const dataURL = imageData.imageBase64.startsWith('data:')
                ? imageData.imageBase64
                : `data:${imageData.mimeType || file.type};base64,${imageData.imageBase64}`
            onSave(dataURL, imageData.mimeType)
        },
        [file.type, onSave],
    )

    const shouldForwardProp = useCallback(
        (prop: string) => !FILEROBOT_CUSTOM_PROPS.has(prop),
        [],
    )

    const filerobotTheme = useMemo(() => getFilerobotTheme(dark), [dark])
    const editorCssOverrides = useMemo(
        () => getImageEditorCssOverrides(dark),
        [dark],
    )

    // SSR-safe: don't render portals on the server
    if (!isClient) return null

    return createPortal(
        <div className="upup-scope">
            <div
                ref={overlayRef}
                role="dialog"
                aria-modal="true"
                aria-label={`Edit image: ${file.name}`}
                tabIndex={-1}
                className="upup-fixed upup-inset-0 upup-z-[2147483647] upup-flex upup-items-center upup-justify-center upup-bg-black/60 upup-outline-none"
                onClick={onClose}
                onKeyDown={handleKeyDown}
            >
                <div
                    className={cn(
                        'upup-relative upup-flex upup-h-[90vh] upup-w-[90vw] upup-max-w-5xl upup-flex-col upup-overflow-hidden upup-rounded-xl upup-shadow-2xl',
                        dark ? 'upup-bg-[#232323]' : 'upup-bg-white',
                    )}
                    data-upup-theme={dark ? 'dark' : 'light'}
                    onClick={handleContentClick}
                >
                    {editorCssOverrides && (
                        <style
                            dangerouslySetInnerHTML={{
                                __html: editorCssOverrides,
                            }}
                        />
                    )}

                    {/* Header */}
                    <div
                        className={cn(
                            'upup-flex upup-items-center upup-justify-between upup-border-b upup-px-4 upup-py-3',
                            dark
                                ? 'upup-border-gray-700 upup-text-gray-200'
                                : 'upup-border-gray-200 upup-text-gray-800',
                        )}
                    >
                        <h2 className="upup-text-sm upup-font-medium">
                            Edit image — {file.name}
                        </h2>
                        <button
                            type="button"
                            aria-label="Close editor"
                            className={cn(
                                'upup-flex upup-h-7 upup-w-7 upup-items-center upup-justify-center upup-rounded-full',
                                'upup-text-lg upup-leading-none upup-transition-colors',
                                dark
                                    ? 'upup-text-gray-400 hover:upup-bg-gray-700 hover:upup-text-gray-200'
                                    : 'upup-text-gray-500 hover:upup-bg-gray-100 hover:upup-text-gray-800',
                            )}
                            onClick={onClose}
                        >
                            ×
                        </button>
                    </div>

                    {/* Editor body */}
                    <div className="upup-relative upup-flex-1 upup-overflow-hidden">
                        {loadError && (
                            <div className="upup-flex upup-h-full upup-items-center upup-justify-center upup-p-8">
                                <p
                                    className={cn(
                                        'upup-text-center upup-text-sm',
                                        dark
                                            ? 'upup-text-red-400'
                                            : 'upup-text-red-600',
                                    )}
                                >
                                    {loadError}
                                </p>
                            </div>
                        )}

                        {!EditorComponent && !loadError && (
                            <div className="upup-flex upup-h-full upup-items-center upup-justify-center">
                                <div
                                    className={cn(
                                        'upup-h-8 upup-w-8 upup-animate-spin upup-rounded-full upup-border-2 upup-border-t-transparent',
                                        dark
                                            ? 'upup-border-gray-500'
                                            : 'upup-border-gray-300',
                                    )}
                                />
                            </div>
                        )}

                        {EditorComponent && !loadError && (
                            <EditorWrapper
                                StyleSheetMgr={StyleSheetMgr}
                                shouldForwardProp={shouldForwardProp}
                            >
                                <EditorComponent
                                    source={file.url}
                                    onSave={handleEditorSave}
                                    onClose={onClose}
                                    savingPixelRatio={4}
                                    previewPixelRatio={4}
                                    theme={filerobotTheme}
                                    defaultTabId={
                                        editorConstants?.TABS
                                            ? (
                                                  editorConstants.TABS as Record<
                                                      string,
                                                      unknown
                                                  >
                                              ).ADJUST
                                            : undefined
                                    }
                                    onBeforeSave={() => false}
                                />
                            </EditorWrapper>
                        )}
                    </div>
                </div>
            </div>
        </div>,
        document.body,
    )
})
