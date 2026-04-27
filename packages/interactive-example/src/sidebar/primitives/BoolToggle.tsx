import React, { useId } from 'react'
import { useConfig } from '../../state/useConfig'

export function BoolToggle({
    propId,
    label,
    description,
    defaultValue,
}: {
    propId: string
    label: string
    description?: string
    /**
     * The declared default for this prop. Determines what unchecking writes
     * to config: when the user toggles AWAY from the default we record the
     * explicit boolean (so e.g. unchecking `showBranding` actually writes
     * `false`); when they toggle BACK to the default we clear the entry to
     * `undefined` so the URL/code snippet stays minimal.
     */
    defaultValue?: boolean
}) {
    const id = useId()
    const { value, set } = useConfig(propId)
    // Display: explicit true beats anything; otherwise fall back to the
    // declared default so default-true bools render the switch as on.
    const checked = value === true || (value === undefined && defaultValue === true)
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
                onChange={(e) => {
                    const next = e.currentTarget.checked
                    // Match-default → undefined (clean URL), diverge → write
                    // the explicit boolean. Default-undefined bools collapse
                    // false to undefined for backward compat.
                    if (defaultValue === undefined) {
                        set(next || undefined)
                        return
                    }
                    set(next === defaultValue ? undefined : next)
                }}
            />
        </label>
    )
}
