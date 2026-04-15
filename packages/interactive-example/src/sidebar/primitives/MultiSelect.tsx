import React from 'react'
import { useConfig } from '../../state/useConfig'

export function MultiSelect({
    propId,
    label,
    options,
}: {
    propId: string
    label: string
    options: string[]
}) {
    const { value, set } = useConfig(propId)
    const selected = Array.isArray(value) ? (value as string[]) : []

    function toggle(opt: string) {
        const next = selected.includes(opt)
            ? selected.filter((s) => s !== opt)
            : [...selected, opt]
        set(next.length === 0 ? undefined : next)
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
