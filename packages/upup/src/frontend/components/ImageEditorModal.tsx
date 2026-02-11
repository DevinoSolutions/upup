import React, {
    ComponentType,
    memo,
    useCallback,
    useEffect,
    useRef,
    useState,
} from 'react'
import { createPortal } from 'react-dom'
import { FileWithParams } from '../../shared/types'
import { useRootContext } from '../context/RootContext'
import { cn } from '../lib/tailwind'

type Props = {
    file: FileWithParams
    onClose: () => void
    onSave: (editedImageData: string, mimeType?: string) => void
}

/**
 * Filerobot's onBeforeSave / onSave callback signature.
 * We only use the imageData.imageBase64 field.
 */
type FilerobotImageState = {
    imageBase64?: string
    fullName?: string
    mimeType?: string
    width?: number
    height?: number
}

type FilerobotDesignState = Record<string, unknown>

/**
 * The props shape of the default-exported <FilerobotImageEditor> component.
 * We only type the subset we use to keep this lightweight.
 */
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
    annotationsCommon?: Record<string, unknown>
    Rotate?: Record<string, unknown>
    Crop?: Record<string, unknown>
    tabsIds?: unknown[]
    defaultTabId?: unknown
    defaultToolId?: unknown
    [key: string]: unknown
}

/**
 * Accessible modal shell for the image editor.
 * Lazy-loads `react-filerobot-image-editor` at runtime so the dependency
 * is never bundled into the core entry point.
 *
 * - Focus trap: keeps focus inside the modal while open.
 * - ESC closes.
 * - Restores focus to the triggering element on close.
 * - aria-label / role="dialog".
 */
export default memo(function ImageEditorModal(props: Props) {
    const { file, onClose, onSave } = props
    const {
        props: { dark, imageEditor: editorConfig },
    } = useRootContext()

    const overlayRef = useRef<HTMLDivElement>(null)
    const previousFocusRef = useRef<Element | null>(null)

    // Lazy-loaded editor component + TABS/TOOLS constants
    const [EditorComponent, setEditorComponent] =
        useState<ComponentType<FilerobotEditorProps> | null>(null)
    const [editorConstants, setEditorConstants] = useState<{
        TABS: Record<string, unknown>
        TOOLS: Record<string, unknown>
    } | null>(null)
    const [loadError, setLoadError] = useState<string | null>(null)

    // Dynamically import react-filerobot-image-editor (browser only)
    useEffect(() => {
        if (typeof window === 'undefined') return

        let cancelled = false
        ;(async () => {
            try {
                const mod = await import(
                    /* webpackIgnore: true */
                    'react-filerobot-image-editor'
                )
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

    // Capture the element that had focus before the modal opened
    // and restore it when the modal closes.
    useEffect(() => {
        previousFocusRef.current = document.activeElement
        return () => {
            if (previousFocusRef.current instanceof HTMLElement) {
                previousFocusRef.current.focus()
            }
        }
    }, [])

    // Auto-focus the overlay so keyboard events work immediately.
    useEffect(() => {
        overlayRef.current?.focus()
    }, [])

    // Close on ESC
    const handleKeyDown = useCallback(
        (e: React.KeyboardEvent) => {
            if (e.key === 'Escape') {
                e.stopPropagation()
                onClose()
            }

            // Basic focus trap: Tab cycles within the modal.
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

    // Prevent clicks on the inner content from closing the modal
    const handleContentClick = useCallback(
        (e: React.MouseEvent) => e.stopPropagation(),
        [],
    )

    // Filerobot onSave handler
    const handleEditorSave = useCallback(
        (imageData: FilerobotImageState) => {
            if (!imageData.imageBase64) return
            const dataURL = imageData.imageBase64.startsWith('data:')
                ? imageData.imageBase64
                : `data:${imageData.mimeType || file.type};base64,${
                      imageData.imageBase64
                  }`
            onSave(dataURL, imageData.mimeType)
        },
        [file.type, onSave],
    )

    // Build Filerobot tabs from config
    const resolvedTabs = editorConstants?.TABS
        ? editorConfig.tabs?.map(
              tab =>
                  (editorConstants.TABS as Record<string, unknown>)[
                      tab.toUpperCase()
                  ] ?? tab,
          )
        : undefined

    return createPortal(
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
                onClick={handleContentClick}
            >
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
                        <EditorComponent
                            source={file.url}
                            onSave={handleEditorSave}
                            onClose={onClose}
                            savingPixelRatio={4}
                            previewPixelRatio={4}
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
                            tabsIds={resolvedTabs}
                            onBeforeSave={() => false}
                        />
                    )}
                </div>
            </div>
        </div>,
        document.body,
    )
})
