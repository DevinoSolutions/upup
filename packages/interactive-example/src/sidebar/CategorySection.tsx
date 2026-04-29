import React, { useState, useContext } from 'react'
import { ConfigContext } from '../state/ConfigContext'
import type { CategoryDefinition, ToggleEntry, UpupConfig } from '../types'
import {
    BoolToggle,
    NumberInput,
    EnumSelect,
    MultiSelect,
    StringInput,
    NestedConfig,
    SizeUnitInput,
    ColorInput,
    ComboInput,
    type ComboPreset,
} from './primitives'
import { SOURCE_META, type SourceMeta } from '../icons/source-meta'
import { ENUM_META_BY_PROP } from '../icons/provider-meta'
import { isVisible, readPath as readPathShared } from '../state/propPath'

/**
 * Map each cloud-drive source id to the `cloudDrives.*` config path that
 * must hold a clientId for that drive to work. Used to grey out tiles when
 * the host env never provided credentials.
 */
const DRIVE_CREDENTIAL_PATHS: Record<string, string> = {
    google_drive: 'cloudDrives.googleDrive.clientId',
    onedrive: 'cloudDrives.oneDrive.clientId',
    dropbox: 'cloudDrives.dropbox.clientId',
    box: 'cloudDrives.box.clientId',
}

// Local alias kept so the rest of this file's call sites stay clean.
const readPath = readPathShared

function computeUnavailableSources(config: UpupConfig): Record<string, string> {
    const out: Record<string, string> = {}
    for (const [source, path] of Object.entries(DRIVE_CREDENTIAL_PATHS)) {
        const clientId = readPath(config, path)
        if (!clientId || typeof clientId !== 'string' || clientId.trim() === '') {
            out[source] = 'Client ID and secret not provided. Set the corresponding NEXT_PUBLIC_*_CLIENT_ID env var (or fill Advanced → self-host → cloud drive section) to enable this source.'
        }
    }
    return out
}

function renderEntry(entry: ToggleEntry, config: UpupConfig) {
    if (!isVisible(entry.visibleWhen, config)) return null
    switch (entry.primitive) {
        case 'bool':
            return <BoolToggle key={entry.id} propId={entry.id} label={entry.label} description={entry.description} defaultValue={entry.defaultValue as boolean | undefined} />
        case 'number':
            return <NumberInput key={entry.id} propId={entry.id} label={entry.label} description={entry.description} min={entry.options?.min as number | undefined} max={entry.options?.max as number | undefined} step={entry.options?.step as number | undefined} defaultValue={entry.defaultValue as number | undefined} display={entry.options?.display as 'slider' | 'number' | undefined} format={entry.options?.format as 'percent' | undefined} />
        case 'enum':
            return <EnumSelect key={entry.id} propId={entry.id} label={entry.label} description={entry.description} options={(entry.options?.options as string[]) ?? []} layout={entry.options?.layout as 'segmented' | 'select' | undefined} defaultValue={entry.defaultValue as string | undefined} meta={ENUM_META_BY_PROP[entry.id]} expandAfter={entry.options?.expandAfter as number | undefined} />
        case 'multi':
            return <MultiSelect key={entry.id} propId={entry.id} label={entry.label} options={(entry.options?.options as string[]) ?? []} meta={entry.id === 'sources' ? SOURCE_META : (entry.options?.meta as Record<string, SourceMeta> | undefined)} unavailable={entry.id === 'sources' ? computeUnavailableSources(config) : undefined} />
        case 'string':
            return <StringInput key={entry.id} propId={entry.id} label={entry.label} description={entry.description} placeholder={entry.options?.placeholder as string | undefined} />
        case 'nested':
            return <NestedConfig key={entry.id} parentPath={entry.id} label={entry.label} fields={(entry.options?.fields as ToggleEntry[]) ?? []} legendIcon={entry.options?.legendIcon as React.FC | undefined} />
        case 'size-unit':
            return <SizeUnitInput key={entry.id} propId={entry.id} label={entry.label} defaultSize={entry.options?.defaultSize as number | undefined} defaultUnit={entry.options?.defaultUnit as 'B' | 'KB' | 'MB' | 'GB' | undefined} serialize={entry.options?.serialize as 'object' | 'bytes' | undefined} />
        case 'color':
            return <ColorInput key={entry.id} propId={entry.id} label={entry.label} placeholder={entry.options?.placeholder as string | undefined} defaultValue={entry.defaultValue as string | undefined} />
        case 'combo':
            return <ComboInput key={entry.id} propId={entry.id} label={entry.label} description={entry.description} placeholder={entry.options?.placeholder as string | undefined} presets={(entry.options?.presets as ComboPreset[]) ?? []} />
    }
}

function shallowEqual(a: unknown, b: unknown): boolean {
    if (Object.is(a, b)) return true
    if (Array.isArray(a) && Array.isArray(b)) {
        if (a.length !== b.length) return false
        return a.every((x, i) => Object.is(x, b[i]))
    }
    return false
}

/**
 * Count entries whose current value meaningfully diverges from the declared
 * default. With defaults seeded into the config (so sidebar/preview/code
 * agree on the out-of-the-box state), a "N set" counter that simply
 * enumerates non-undefined values would always report the full category
 * — useless. This version reports "what the user has changed".
 */
function countSet(config: unknown, entries: ToggleEntry[]): number {
    let count = 0
    for (const entry of entries) {
        if (entry.primitive === 'nested') continue
        const path = entry.id.split('.')
        let cur: any = config
        for (const k of path) {
            if (cur == null) { cur = undefined; break }
            cur = cur[k]
        }
        const isEmpty =
            cur === undefined ||
            cur === null ||
            cur === '' ||
            (Array.isArray(cur) && cur.length === 0)
        if (isEmpty) continue
        if (shallowEqual(cur, entry.defaultValue)) continue
        count++
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
    const Icon = category.icon
    return (
        <section className="upup-ie-category" data-open={open}>
            <button type="button" className="upup-ie-category-header" onClick={() => setOpen((v) => !v)}>
                <span className="upup-ie-category-chevron">{open ? '▾' : '▸'}</span>
                {Icon ? <span className="upup-ie-category-icon" aria-hidden="true"><Icon /></span> : null}
                <span className="upup-ie-category-label">{category.label}</span>
                <span className="upup-ie-category-count">{setCount > 0 ? `${setCount} set` : ''}</span>
            </button>
            {open && (
                <div className="upup-ie-category-body">
                    {category.intro ? (
                        <p className="upup-ie-category-intro">{category.intro}</p>
                    ) : null}
                    {renderBody(category.entries, ctx?.config ?? {})}
                </div>
            )}
        </section>
    )
}

function renderBody(entries: ToggleEntry[], config: UpupConfig) {
    // Flat render when no entry declares a group
    if (!entries.some((e) => e.group)) {
        return entries.map((e) => renderEntry(e, config))
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
            {g.items.map((e) => renderEntry(e, config))}
        </React.Fragment>
    ))
}
