import { uploadCategory } from './upload'
import { sourcesCategory } from './sources'
import { limitsCategory } from './limits'
import { processingCategory } from './processing'
import { editorCategory } from './editor'
import { behaviorCategory } from './behavior'
import { appearanceCategory } from './appearance'
import { languageCategory } from './language'
import { eventsCategory } from './events'
import { advancedCategory } from './advanced'
import type { CategoryDefinition, ToggleEntry, UpupConfig } from '../types'

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
    advancedCategory,
]

export function allEntries(): ToggleEntry[] {
    return categories.flatMap((c) => c.entries)
}

export function findEntry(propId: string): ToggleEntry | undefined {
    return allEntries().find((e) => e.id === propId)
}

/**
 * Walk a dotted path like "theme.mode" or "cloudDrives.googleDrive.clientId" and
 * set the value on the target object, creating intermediate objects as needed.
 */
function setByPath(target: Record<string, unknown>, path: string, value: unknown): void {
    const parts = path.split('.')
    let cursor: Record<string, unknown> = target
    for (let i = 0; i < parts.length - 1; i++) {
        const key = parts[i]
        if (key === undefined) continue
        if (typeof cursor[key] !== 'object' || cursor[key] === null) {
            cursor[key] = {}
        }
        cursor = cursor[key] as Record<string, unknown>
    }
    const lastKey = parts[parts.length - 1]
    if (lastKey !== undefined) cursor[lastKey] = value
}

/**
 * Build a default config from every entry's `defaultValue`, so the sidebar's
 * pre-selection, the rendered preview, and the code tab stay aligned with
 * what the uploader actually does out of the box. Entries with
 * `primitive: 'nested'` are skipped — those are containers, not leaves; their
 * inner fields are overrides-only and default to undefined.
 *
 * Events are skipped too — each event handler defaults to off; seeding it
 * would emit console.log spies before the user opts in.
 */
export function buildDefaultConfig(): UpupConfig {
    const out: Record<string, unknown> = {}
    for (const entry of allEntries()) {
        if (entry.primitive === 'nested') continue
        if (entry.defaultValue === undefined) continue
        // Events are structured as { events: { onFoo: boolean, ... } } — skip,
        // they're always-off-by-default spies.
        if (entry.id.startsWith('events.')) continue
        setByPath(out, entry.id, entry.defaultValue)
    }
    return out as UpupConfig
}
