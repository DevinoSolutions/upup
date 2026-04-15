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
} from './primitives'

function renderEntry(entry: ToggleEntry) {
    switch (entry.primitive) {
        case 'bool':
            return <BoolToggle key={entry.id} propId={entry.id} label={entry.label} description={entry.description} />
        case 'number':
            return <NumberInput key={entry.id} propId={entry.id} label={entry.label} min={entry.options?.min as number | undefined} max={entry.options?.max as number | undefined} step={entry.options?.step as number | undefined} />
        case 'enum':
            return <EnumSelect key={entry.id} propId={entry.id} label={entry.label} options={(entry.options?.options as string[]) ?? []} />
        case 'multi':
            return <MultiSelect key={entry.id} propId={entry.id} label={entry.label} options={(entry.options?.options as string[]) ?? []} />
        case 'string':
            return <StringInput key={entry.id} propId={entry.id} label={entry.label} placeholder={entry.options?.placeholder as string | undefined} />
        case 'nested':
            return <NestedConfig key={entry.id} parentPath={entry.id} label={entry.label} fields={(entry.options?.fields as ToggleEntry[]) ?? []} />
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
                    {category.entries.map(renderEntry)}
                </div>
            )}
        </section>
    )
}
