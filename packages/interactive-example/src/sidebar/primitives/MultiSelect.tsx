import React from 'react'
import { useConfig } from '../../state/useConfig'
import type { SourceMeta } from '../../icons/source-meta'

export function MultiSelect({
    propId,
    label,
    options,
    meta,
}: {
    propId: string
    label: string
    options: string[]
    /**
     * Optional per-option icon + humanised label. When present the options
     * render as brand tiles instead of plain checkboxes.
     */
    meta?: Record<string, SourceMeta>
}) {
    const { value, set } = useConfig(propId)
    const selected = Array.isArray(value) ? (value as string[]) : []

    function toggle(opt: string) {
        const next = selected.includes(opt)
            ? selected.filter((s) => s !== opt)
            : [...selected, opt]
        set(next.length === 0 ? undefined : next)
    }

    if (meta) {
        return (
            <div className="upup-ie-field">
                <span className="upup-ie-field-label">{label}</span>
                <div className="upup-ie-source-grid">
                    {options.map((o) => {
                        const entry = meta[o]
                        const Icon = entry?.Icon
                        const labelText = entry?.label ?? o
                        const active = selected.includes(o)
                        return (
                            <button
                                key={o}
                                type="button"
                                className="upup-ie-source-tile"
                                data-active={active || undefined}
                                aria-pressed={active}
                                title={labelText}
                                onClick={() => toggle(o)}
                            >
                                {Icon ? (
                                    <span className="upup-ie-source-tile-icon"><Icon /></span>
                                ) : null}
                                <span className="upup-ie-source-tile-label">{labelText}</span>
                            </button>
                        )
                    })}
                </div>
            </div>
        )
    }

    return (
        <div className="upup-ie-field">
            <span className="upup-ie-field-label">{label}</span>
            <div className="upup-ie-multiselect">
                {options.map((o) => (
                    <label key={o} className="upup-ie-multiselect-item">
                        <input
                            type="checkbox"
                            checked={selected.includes(o)}
                            onChange={() => toggle(o)}
                        />
                        <span>{o}</span>
                    </label>
                ))}
            </div>
        </div>
    )
}
