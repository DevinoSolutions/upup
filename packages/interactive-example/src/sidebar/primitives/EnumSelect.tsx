import React, { useId } from 'react'
import { useConfig } from '../../state/useConfig'

export function EnumSelect({
    propId,
    label,
    options,
    layout,
}: {
    propId: string
    label: string
    options: string[]
    layout?: 'segmented' | 'select'
}) {
    const id = useId()
    const { value, set } = useConfig(propId)
    const current = typeof value === 'string' ? value : ''

    // Auto-pick segmented for short option lists unless the entry explicitly
    // opts into 'select'. Long lists (locales etc.) stay as a <select>.
    const resolvedLayout = layout ?? (options.length > 0 && options.length <= 6 ? 'segmented' : 'select')

    if (resolvedLayout === 'segmented') {
        return (
            <div className="upup-ie-field" role="radiogroup" aria-labelledby={id}>
                <span id={id} className="upup-ie-field-label">{label}</span>
                <div className="upup-ie-segmented">
                    {options.map((o) => {
                        const active = current === o
                        return (
                            <button
                                key={o}
                                type="button"
                                role="radio"
                                aria-checked={active}
                                data-active={active || undefined}
                                className="upup-ie-segmented-option"
                                onClick={() => set(active ? undefined : o)}
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
            <span className="upup-ie-field-label">{label}</span>
            <select
                id={id}
                value={current}
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
