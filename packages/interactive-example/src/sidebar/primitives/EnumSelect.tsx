import React, { useId } from 'react'
import { useConfig } from '../../state/useConfig'

export function EnumSelect({
    propId,
    label,
    options,
}: {
    propId: string
    label: string
    options: string[]
}) {
    const id = useId()
    const { value, set } = useConfig(propId)
    return (
        <label htmlFor={id} className="upup-ie-field">
            <span className="upup-ie-field-label">{label}</span>
            <select
                id={id}
                value={typeof value === 'string' ? value : ''}
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
