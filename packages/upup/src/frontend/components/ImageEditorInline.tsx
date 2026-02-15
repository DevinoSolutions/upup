import React, {
    ComponentType,
    memo,
    useCallback,
    useEffect,
    useRef,
    useState,
} from 'react'
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
 */
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
    annotationsCommon?: Record<string, unknown>
    Rotate?: Record<string, unknown>
    Crop?: Record<string, unknown>
    tabsIds?: unknown[]
    defaultTabId?: unknown
    defaultToolId?: unknown
    [key: string]: unknown
}

/**
 * Inline image editor that overlays on top of the uploader container,
 * giving an "edit in place" experience similar to Uppy.
 *
 * Unlike ImageEditorModal, this does NOT use a portal or fixed positioning.
 * It renders as an absolutely positioned overlay inside the uploader's
 * <section>, covering the file list and other UI underneath.
 */
export default memo(function ImageEditorInline(props: Props) {
    const { file, onClose, onSave } = props
    const {
        props: { dark, imageEditor: editorConfig },
    } = useRootContext()

    const containerRef = useRef<HTMLDivElement>(null)

    // Lazy-loaded editor component + TABS/TOOLS constants
    const [EditorComponent, setEditorComponent] =
        useState<ComponentType<FilerobotEditorProps> | null>(null)
    const [editorConstants, setEditorConstants] = useState<{
        TABS: Record<string, unknown>
        TOOLS: Record<string, unknown>
    } | null>(null)
    const [loadError, setLoadError] = useState<string | null>(null)

    // StyleSheetManager from styled-components to filter custom props
    const [StyleSheetMgr, setStyleSheetMgr] = useState<ComponentType<{
        shouldForwardProp?: (prop: string) => boolean
        children: React.ReactNode
    }> | null>(null)

    // Dynamically import react-filerobot-image-editor (browser only)
    useEffect(() => {
        if (typeof window === 'undefined') return

        let cancelled = false
        ;(async () => {
            try {
                const [mod, scMod] = await Promise.all([
                    import(
                        /* webpackIgnore: true */
                        'react-filerobot-image-editor'
                    ),
                    import(
                        /* webpackIgnore: true */
                        'styled-components'
                    ).catch(() => null),
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

    // Close on ESC
    const handleKeyDown = useCallback(
        (e: React.KeyboardEvent) => {
            if (e.key === 'Escape') {
                e.stopPropagation()
                onClose()
            }
        },
        [onClose],
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

    // Filter styled-components custom props to avoid React 19 warnings
    const shouldForwardProp = useCallback(
        (prop: string) => !FILEROBOT_CUSTOM_PROPS.has(prop),
        [],
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

    return (
        <div
            ref={containerRef}
            role="region"
            aria-label={`Editing image: ${file.name}`}
            tabIndex={-1}
            className={cn(
                'upup-absolute upup-inset-0 upup-z-50 upup-flex upup-flex-col upup-overflow-hidden upup-rounded-2xl',
                dark ? 'upup-bg-[#232323]' : 'upup-bg-white',
            )}
            onKeyDown={handleKeyDown}
        >
            {/* Header — Cancel / Title / (Save is handled by Filerobot) */}
            <div
                className={cn(
                    'upup-flex upup-items-center upup-justify-between upup-border-b upup-px-4 upup-py-2',
                    dark
                        ? 'upup-border-gray-700'
                        : 'upup-border-gray-200',
                )}
            >
                <button
                    type="button"
                    className={cn(
                        'upup-text-sm upup-font-medium upup-transition-colors',
                        dark
                            ? 'upup-text-gray-300 hover:upup-text-white'
                            : 'upup-text-gray-600 hover:upup-text-gray-900',
                    )}
                    onClick={onClose}
                >
                    Cancel
                </button>
                <span
                    className={cn(
                        'upup-text-sm upup-font-medium',
                        dark ? 'upup-text-gray-200' : 'upup-text-gray-800',
                    )}
                >
                    Editing {file.name}
                </span>
                {/* Save is handled by Filerobot's built-in save button */}
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
                    </EditorWrapper>
                )}
            </div>
        </div>
    )
})

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

/**
 * Wraps children with styled-components' StyleSheetManager (when available)
 * to prevent custom props from leaking to the DOM in React 19+.
 */
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
