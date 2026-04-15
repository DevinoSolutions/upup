import { uploadCategory } from './upload'
import { sourcesCategory } from './sources'
import { limitsCategory } from './limits'
import { processingCategory } from './processing'
import { editorCategory } from './editor'
import { behaviorCategory } from './behavior'
import { appearanceCategory } from './appearance'
import { languageCategory } from './language'
import { eventsCategory } from './events'
import type { CategoryDefinition, ToggleEntry } from '../types'

export const categories: CategoryDefinition[] = [
    uploadCategory,
    sourcesCategory,
    limitsCategory,
    processingCategory,
    editorCategory,
    behaviorCategory,
    appearanceCategory,
    languageCategory,
    eventsCategory,
]

export function allEntries(): ToggleEntry[] {
    return categories.flatMap((c) => c.entries)
}

export function findEntry(propId: string): ToggleEntry | undefined {
    return allEntries().find((e) => e.id === propId)
}
