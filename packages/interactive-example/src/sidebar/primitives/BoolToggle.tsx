import React, { useId } from 'react'
import { useConfig } from '../../state/useConfig'

export function BoolToggle({
    propId,
    label,
    description,
}: {
    propId: string
    label: string
    description?: string
}) {
    const id = useId()
    const { value, set } = useConfig(propId)
    const checked = value === true
    return (
        <label htmlFor={id} className="upup-ie-toggle">
            <div className="upup-ie-toggle-text">
                <span className="upup-ie-toggle-label">{label}</span>
                {description && (
                    <span className="upup-ie-toggle-description">{description}</span>
                )}
            </div>
            <input
                id={id}
                type="checkbox"
                checked={checked}
                onChange={(e) => set(e.currentTarget.checked || undefined)}
            />
        </label>
    )
}
