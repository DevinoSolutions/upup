import React from 'react'

/**
 * Shared label + description block used by every primitive. Keeps the
 * markup consistent: an uppercase label, optional muted description
 * below it. BoolToggle renders its own variant since its layout is
 * row-based (toggle on the right).
 */
export function FieldLabel({
    id,
    label,
    description,
}: {
    id?: string | undefined
    label: string
    description?: string | undefined
}) {
    return (
        <>
            <span id={id} className="upup-ie-field-label">{label}</span>
            {description && (
                <span className="upup-ie-field-description">{description}</span>
            )}
        </>
    )
}
