import { createRoot, type Root } from 'react-dom/client'
import { StyleSheetManager } from 'styled-components'
import FilerobotImageEditor, {
    type FilerobotImageEditorConfig,
} from 'react-filerobot-image-editor'
import type { IslandHandle, IslandProps } from './filerobot-island-types'

/**
 * Real-React island for the Filerobot image editor.
 *
 * Built by a SECOND, alias-free tsup config (added in a later task) that inlines real
 * react / react-dom / react-konva / konva / styled-components / filerobot into one
 * lazy chunk (dist/filerobot-island.js). Loaded only when the editor opens, via the
 * bridge's dynamic import. This file is typechecked by tsconfig.island.json.
 */

// Filerobot's styled-components leak these custom props to the DOM; filter them
// (mirrors FILEROBOT_CUSTOM_PROPS in @upup/react's editor chrome).
const FILEROBOT_CUSTOM_PROPS = new Set([
    'active',
    'noMargin',
    'showBackButton',
    'isPhoneScreen',
    'showTabsDrawer',
    'hasChildren',
    'isAccordion',
])
const shouldForwardProp = (prop: string) => !FILEROBOT_CUSTOM_PROPS.has(prop)

function Editor(props: IslandProps) {
    return (
        <StyleSheetManager shouldForwardProp={shouldForwardProp}>
            <FilerobotImageEditor
                {...(props as unknown as FilerobotImageEditorConfig)}
            />
        </StyleSheetManager>
    )
}

export function mount(
    container: HTMLElement,
    props: IslandProps,
): IslandHandle {
    const root: Root = createRoot(container)
    root.render(<Editor {...props} />)
    return {
        update(next: IslandProps) {
            root.render(<Editor {...next} />)
        },
        unmount() {
            root.unmount()
        },
    }
}
