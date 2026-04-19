import React, { useId } from 'react'
import { useConfig } from '../../state/useConfig'
import { FieldLabel } from './FieldLabel'

export function StringInput({
    propId,
    label,
    placeholder,
    description,
}: {
    propId: string
    label: string
    placeholder?: string
    description?: string
}) {
    const id = useId()
    const { value, set } = useConfig(propId)
    return (
        <label htmlFor={id} className="upup-ie-field">
            <FieldLabel label={label} description={description} />
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
