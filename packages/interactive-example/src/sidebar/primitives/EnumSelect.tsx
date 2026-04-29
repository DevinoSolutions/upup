import React, { useId, useState } from 'react'
import { useConfig } from '../../state/useConfig'
import { FieldLabel } from './FieldLabel'
import type { SourceMeta } from '../../icons/source-meta'

export function EnumSelect({
    propId,
    label,
    options,
    layout,
    defaultValue,
    description,
    meta,
    expandAfter,
}: {
    propId: string
    label: string
    options: string[]
    layout?: 'segmented' | 'select'
    defaultValue?: string
    description?: string
    meta?: Record<string, SourceMeta>
    expandAfter?: number
}) {
    const id = useId()
    const { value, set } = useConfig(propId)
    const [expanded, setExpanded] = useState(false)
    const current = typeof value === 'string' ? value : ''
    const visual = current || (defaultValue ?? '')

    const resolvedLayout = layout ?? (options.length > 0 && options.length <= 6 ? 'segmented' : 'select')

    const useTileLayout = !!meta && options.some((o) => !!meta[o]?.Icon)

    if (useTileLayout && meta) {
        const hasOverflow = expandAfter != null && options.length > expandAfter
        const primary = hasOverflow ? options.slice(0, expandAfter) : options
        const overflow = hasOverflow ? options.slice(expandAfter) : []

        const renderTile = (o: string) => {
            const entry = meta[o]
            const Icon = entry?.Icon
            const labelText = entry?.label ?? o
            const active = visual === o
            const isDefaultFallback = !current && defaultValue === o
            return (
                <button
                    key={o}
                    type="button"
                    role="radio"
                    aria-checked={active}
                    data-active={active || undefined}
                    data-default-fallback={isDefaultFallback || undefined}
                    className="upup-ie-source-tile"
                    title={labelText}
                    onClick={() => set(current === o ? undefined : o)}
                >
                    {Icon ? (
                        <span className="upup-ie-source-tile-icon"><Icon /></span>
                    ) : null}
                    <span className="upup-ie-source-tile-label">{labelText}</span>
                </button>
            )
        }

        return (
            <div className="upup-ie-field" role="radiogroup" aria-labelledby={id}>
                <FieldLabel id={id} label={label} description={description} />
                <div className="upup-ie-source-grid">
                    {primary.map(renderTile)}
                </div>
                {overflow.length > 0 && (
                    <>
                        <div className="upup-ie-expand-wrap" data-expanded={expanded || undefined}>
                            <div className="upup-ie-expand-inner">
                                <div className="upup-ie-source-grid">
                                    {overflow.map(renderTile)}
                                </div>
                            </div>
                        </div>
                        <button
                            type="button"
                            className="upup-ie-expand-toggle"
                            onClick={() => setExpanded((v) => !v)}
                        >
                            {expanded ? 'Show less' : `See more (${overflow.length})`}
                        </button>
                    </>
                )}
            </div>
        )
    }

    if (resolvedLayout === 'segmented') {
        return (
            <div className="upup-ie-field" role="radiogroup" aria-labelledby={id}>
                <FieldLabel id={id} label={label} description={description} />
                <div className="upup-ie-segmented">
                    {options.map((o) => {
                        const active = visual === o
                        const isDefaultFallback = !current && defaultValue === o
                        const labelText = meta?.[o]?.label ?? o
                        return (
                            <button
                                key={o}
                                type="button"
                                role="radio"
                                aria-checked={active}
                                data-active={active || undefined}
                                data-default-fallback={isDefaultFallback || undefined}
                                className="upup-ie-segmented-option"
                                onClick={() => set(current === o ? undefined : o)}
                            >
                                {labelText}
                            </button>
                        )
                    })}
                </div>
            </div>
        )
    }

    return (
        <label htmlFor={id} className="upup-ie-field">
            <FieldLabel label={label} description={description} />
            <select
                id={id}
                value={visual}
                onChange={(e) => set(e.currentTarget.value || undefined)}
            >
                <option value="">—</option>
                {options.map((o) => (
                    <option key={o} value={o}>
                        {meta?.[o]?.label ?? o}
                    </option>
                ))}
            </select>
        </label>
    )
}
