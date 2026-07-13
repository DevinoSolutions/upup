/**
 * Plain-data contract between the preact/compat bridge and the real-React island.
 * NO react / preact imports — typechecked under BOTH the main (preact/compat)
 * tsconfig and tsconfig.island.json (real react). Mirrors the loose prop surface
 * the @upupjs/react chrome passes to <EditorComponent> (see ImageEditorModal.tsx).
 */
export interface IslandProps {
    source: string
    savingPixelRatio?: number
    previewPixelRatio?: number
    theme?: unknown
    defaultTabId?: unknown
    tabsIds?: unknown[]
    onSave?: (imageData: unknown, designState?: unknown) => void
    onClose?: () => void
    onBeforeSave?: (imageData?: unknown) => boolean | undefined
    [key: string]: unknown
}

export interface IslandHandle {
    update(props: IslandProps): void
    unmount(): void
}

export interface IslandModule {
    mount(container: HTMLElement, props: IslandProps): IslandHandle
}
