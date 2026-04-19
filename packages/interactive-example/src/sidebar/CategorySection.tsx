import React, { useState, useContext } from 'react'
import { ConfigContext } from '../state/ConfigContext'
import type { CategoryDefinition, ToggleEntry } from '../types'
import {
    BoolToggle,
    NumberInput,
    EnumSelect,
    MultiSelect,
    StringInput,
    NestedConfig,
    SizeUnitInput,
    ColorInput,
} from './primitives'
import { SOURCE_META, type SourceMeta } from '../icons/source-meta'

function renderEntry(entry: ToggleEntry) {
    switch (entry.primitive) {
        case 'bool':
            return <BoolToggle key={entry.id} propId={entry.id} label={entry.label} description={entry.description} />
        case 'number':
            return <NumberInput key={entry.id} propId={entry.id} label={entry.label} description={entry.description} min={entry.options?.min as number | undefined} max={entry.options?.max as number | undefined} step={entry.options?.step as number | undefined} defaultValue={entry.defaultValue as number | undefined} display={entry.options?.display as 'slider' | 'number' | undefined} />
        case 'enum':
            return <EnumSelect key={entry.id} propId={entry.id} label={entry.label} description={entry.description} options={(entry.options?.options as string[]) ?? []} layout={entry.options?.layout as 'segmented' | 'select' | undefined} defaultValue={entry.defaultValue as string | undefined} />
        case 'multi':
            return <MultiSelect key={entry.id} propId={entry.id} label={entry.label} options={(entry.options?.options as string[]) ?? []} meta={entry.id === 'sources' ? SOURCE_META : (entry.options?.meta as Record<string, SourceMeta> | undefined)} />
        case 'string':
            return <StringInput key={entry.id} propId={entry.id} label={entry.label} description={entry.description} placeholder={entry.options?.placeholder as string | undefined} />
        case 'nested':
            return <NestedConfig key={entry.id} parentPath={entry.id} label={entry.label} fields={(entry.options?.fields as ToggleEntry[]) ?? []} legendIcon={entry.options?.legendIcon as React.FC | undefined} />
        case 'size-unit':
            return <SizeUnitInput key={entry.id} propId={entry.id} label={entry.label} defaultSize={entry.options?.defaultSize as number | undefined} defaultUnit={entry.options?.defaultUnit as 'B' | 'KB' | 'MB' | 'GB' | undefined} />
        case 'color':
            return <ColorInput key={entry.id} propId={entry.id} label={entry.label} placeholder={entry.options?.placeholder as string | undefined} defaultValue={entry.defaultValue as string | undefined} />
    }
}

function countSet(config: unknown, entries: ToggleEntry[]): number {
    let count = 0
    for (const entry of entries) {
        const path = entry.id.split('.')
        let cur: any = config
        for (const k of path) {
            if (cur == null) { cur = undefined; break }
            cur = cur[k]
        }
        if (cur !== undefined && cur !== null && cur !== '' && (!Array.isArray(cur) || cur.length > 0)) {
            count++
        }
    }
    return count
}

export function CategorySection({
    category,
    defaultExpanded,
}: {
    category: CategoryDefinition
    defaultExpanded: boolean
}) {
    const ctx = useContext(ConfigContext)
    const [open, setOpen] = useState(defaultExpanded)
    const setCount = ctx ? countSet(ctx.config, category.entries) : 0
    return (
        <section className="upup-ie-category" data-open={open}>
            <button type="button" className="upup-ie-category-header" onClick={() => setOpen((v) => !v)}>
                <span className="upup-ie-category-chevron">{open ? '▾' : '▸'}</span>
                <span className="upup-ie-category-label">{category.label}</span>
                <span className="upup-ie-category-count">{setCount > 0 ? `${setCount} set` : ''}</span>
            </button>
            {open && (
                <div className="upup-ie-category-body">
                    {renderBody(category.entries)}
                </div>
            )}
        </section>
    )
}

function renderBody(entries: ToggleEntry[]) {
    // Flat render when no entry declares a group
    if (!entries.some((e) => e.group)) {
        return entries.map(renderEntry)
    }
    // Grouped render — preserves input order while inserting subheaders
    const groups: Array<{ label: string | null; items: ToggleEntry[] }> = []
    for (const entry of entries) {
        const key = entry.group ?? null
        const last = groups[groups.length - 1]
        if (last && last.label === key) last.items.push(entry)
        else groups.push({ label: key, items: [entry] })
    }
    return groups.map((g, idx) => (
        <React.Fragment key={g.label ?? `__ungrouped-${idx}`}>
            {g.label && <div className="upup-ie-group-heading">{g.label}</div>}
            {g.items.map(renderEntry)}
        </React.Fragment>
    ))
}
