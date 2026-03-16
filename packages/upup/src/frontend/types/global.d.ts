interface Window {
    google?: any
}
declare module '*.png' {
    const value: string
    export default value
}

declare module '*.jpg' {
    const value: string
    export default value
}

// Optional peer dependency — only installed by consumers who enable imageEditor.
declare module 'react-filerobot-image-editor' {
    import { ComponentType } from 'react'
    const FilerobotImageEditor: ComponentType<Record<string, unknown>>
    export default FilerobotImageEditor
    export const TABS: Record<string, unknown>
    export const TOOLS: Record<string, unknown>
}

// styled-components is a transitive dep of filerobot-image-editor.
declare module 'styled-components' {
    import { ComponentType, ReactNode } from 'react'
    export const StyleSheetManager: ComponentType<{
        shouldForwardProp?: (prop: string) => boolean
        children: ReactNode
    }>
}
