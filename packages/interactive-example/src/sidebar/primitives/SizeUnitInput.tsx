import React, { useId } from 'react'
import { useConfig } from '../../state/useConfig'

const UNITS = ['B', 'KB', 'MB', 'GB'] as const

/**
 * Combined Size + Unit input rendered on a single row. Collapses the
 * three file-size fieldsets (max/min/maxTotal) from ~180px each down
 * to ~80px.
 */
export function SizeUnitInput({
    propId,
    label,
    defaultSize = 100,
    defaultUnit = 'MB',
    placeholder,
}: {
    propId: string
    label: string
    defaultSize?: number
    defaultUnit?: typeof UNITS[number]
    placeholder?: string
}) {
    const groupId = useId()
    const inputId = useId()
    const { value, set } = useConfig(propId)
    const current = (value ?? {}) as { size?: number; unit?: string }
    const size = current.size ?? ''
    const unit = current.unit ?? ''

    const update = (next: { size?: number; unit?: string }) => {
        // Merge with current so the user can set just one field.
        const merged = { size: current.size, unit: current.unit, ...next }
        // If both are absent, clear the entry entirely.
        if (merged.size === undefined && !merged.unit) {
            set(undefined)
            return
        }
        set(merged)
    }

    return (
        <div className="upup-ie-field">
            <span id={groupId} className="upup-ie-field-label">{label}</span>
            <div className="upup-ie-size-unit" role="group" aria-labelledby={groupId}>
                <input
                    id={inputId}
                    className="upup-ie-size-unit-input"
                    type="number"
                    min={0}
                    aria-label={`${label} — size`}
                    value={size === undefined ? '' : size}
                    placeholder={placeholder ?? String(defaultSize)}
                    onChange={(e) => {
                        const raw = e.currentTarget.value
                        if (raw === '') {
                            update({ size: undefined })
                            return
                        }
                        const n = Number(raw)
                        if (!Number.isNaN(n)) update({ size: n, unit: unit || defaultUnit })
                    }}
                />
                <div className="upup-ie-size-unit-segmented">
                    {UNITS.map((u) => {
                        const active = unit === u
                        return (
                            <button
                                key={u}
                                type="button"
                                role="radio"
                                aria-checked={active}
                                data-active={active || undefined}
                                className="upup-ie-segmented-option upup-ie-size-unit-option"
                                onClick={() => update({ unit: active ? undefined : u })}
                            >
                                {u}
                            </button>
                        )
                    })}
                </div>
            </div>
        </div>
    )
}
