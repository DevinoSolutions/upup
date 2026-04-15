import React, { useId } from 'react'
import { useConfig } from '../../state/useConfig'

export function StringInput({
    propId,
    label,
    placeholder,
}: {
    propId: string
    label: string
    placeholder?: string
}) {
    const id = useId()
    const { value, set } = useConfig(propId)
    return (
        <label htmlFor={id} className="upup-ie-field">
            <span className="upup-ie-field-label">{label}</span>
            <input
                id={id}
                type="text"
                placeholder={placeholder}
                value={typeof value === 'string' ? value : ''}
                onChange={(e) => set(e.currentTarget.value || undefined)}
            />
        </label>
    )
}
