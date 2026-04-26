import React, { useId } from 'react'
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
}: {
    propId: string
    label: string
    options: string[]
    layout?: 'segmented' | 'select'
    /**
     * Declared default — displayed as active when the user hasn't made an
     * explicit choice yet. Clicking an option still writes the explicit
     * value to config; unsetting brings this visual default back.
     */
    defaultValue?: string
    description?: string
    /**
     * Optional per-option icon + humanised label. When present the options
     * render as brand tiles instead of plain segmented buttons — used for
     * storage providers, resumable modes, and theme mode.
     */
    meta?: Record<string, SourceMeta>
}) {
    const id = useId()
    const { value, set } = useConfig(propId)
    const current = typeof value === 'string' ? value : ''
    // Fall back to the declared default purely for display. The config still
    // stores `undefined` until the user actively chooses.
    const visual = current || (defaultValue ?? '')

    // Auto-pick segmented for short option lists unless the entry explicitly
    // opts into 'select'. Long lists (locales etc.) stay as a <select>.
    const resolvedLayout = layout ?? (options.length > 0 && options.length <= 6 ? 'segmented' : 'select')

    if (meta) {
        // Brand-tile renderer mirrors the MultiSelect grid so the sidebar
        // speaks one visual language for any option set with iconography.
        return (
            <div className="upup-ie-field" role="radiogroup" aria-labelledby={id}>
                <FieldLabel id={id} label={label} description={description} />
                <div className="upup-ie-source-grid">
                    {options.map((o) => {
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
                    })}
                </div>
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
                                {o}
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
                        {o}
                    </option>
                ))}
            </select>
        </label>
    )
}
