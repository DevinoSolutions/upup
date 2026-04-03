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
import type { UploadFile } from '@upup/shared'
import { useUploaderContext } from '../context/uploader-context'
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

/**
 * Custom props that filerobot-image-editor's styled-components leak to the DOM.
 */
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
 * Inline image editor that overlays on top of the uploader container,
 * giving an "edit in place" experience.
 *
 * Lazy-loads `react-filerobot-image-editor` at runtime (optional peer dep).
 */
export default memo(function ImageEditorInline(props: Props) {
    const { file, onClose, onSave } = props
    const { resolvedTheme } = useUploaderContext()
    const dark = resolvedTheme.mode === 'dark'

    const containerRef = useRef<HTMLDivElement>(null)

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

    const handleKeyDown = useCallback(
        (e: React.KeyboardEvent) => {
            if (e.key === 'Escape') {
                e.stopPropagation()
                onClose()
            }
        },
        [onClose],
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

    return (
        <div
            ref={containerRef}
            role="region"
            aria-label={`Editing image: ${file.name}`}
            tabIndex={-1}
            className={cn(
                'upup-absolute upup-inset-0 upup-z-[9999] upup-flex upup-flex-col upup-overflow-hidden',
                dark ? 'upup-bg-[#232323]' : 'upup-bg-white',
            )}
            onKeyDown={handleKeyDown}
            data-upup-theme={dark ? 'dark' : 'light'}
        >
            {editorCssOverrides && (
                <style
                    dangerouslySetInnerHTML={{ __html: editorCssOverrides }}
                />
            )}

            {/* Header */}
            <div
                className={cn(
                    'upup-flex upup-items-center upup-justify-between upup-border-b upup-px-4 upup-py-2',
                    dark
                        ? 'upup-border-gray-700 upup-bg-[#232323]'
                        : 'upup-border-gray-200 upup-bg-white',
                )}
            >
                <button
                    type="button"
                    className={cn(
                        'upup-text-sm upup-font-semibold upup-transition-colors',
                        dark
                            ? 'upup-text-[#30C5F7] hover:upup-text-[#6DD8FB]'
                            : 'upup-text-blue-600 hover:upup-text-blue-800',
                    )}
                    onClick={onClose}
                >
                    Cancel
                </button>
                <span
                    className={cn(
                        'upup-text-sm upup-font-semibold',
                        dark ? 'upup-text-gray-100' : 'upup-text-gray-900',
                    )}
                >
                    Editing {file.name}
                </span>
                <span className="upup-w-14" />
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
                            source={file.url ?? ''}
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
    )
})
