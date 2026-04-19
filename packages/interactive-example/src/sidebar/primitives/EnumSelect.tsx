import React, { useId } from 'react'
import { useConfig } from '../../state/useConfig'
import { FieldLabel } from './FieldLabel'

export function EnumSelect({
    propId,
    label,
    options,
    layout,
    defaultValue,
    description,
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
