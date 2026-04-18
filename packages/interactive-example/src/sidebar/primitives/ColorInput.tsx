import React, { useId } from 'react'
import { useConfig } from '../../state/useConfig'

const HEX_PATTERN = /^#[0-9a-fA-F]{6}$/

function normalise(value: string): string {
    const trimmed = value.trim()
    if (!trimmed) return ''
    // Accept `30C5F7` without the leading #
    const withHash = trimmed.startsWith('#') ? trimmed : `#${trimmed}`
    return HEX_PATTERN.test(withHash) ? withHash.toLowerCase() : withHash
}

/**
 * Hex color input paired with a native color picker swatch.
 * Both inputs write the same value to config; the swatch always reflects
 * the validated hex. Consumer passes the current value as either `#30c5f7`
 * or bare hex — both are normalised.
 */
export function ColorInput({
    propId,
    label,
    placeholder,
    defaultValue,
}: {
    propId: string
    label: string
    placeholder?: string
    defaultValue?: string
}) {
    const id = useId()
    const { value, set } = useConfig(propId)
    const current = typeof value === 'string' ? value : ''
    const pickerValue = HEX_PATTERN.test(current)
        ? current
        : HEX_PATTERN.test(defaultValue ?? '')
          ? defaultValue!
          : '#3b82f6'

    return (
        <label htmlFor={id} className="upup-ie-field">
            <span className="upup-ie-field-label">{label}</span>
            <div className="upup-ie-color">
                <input
                    type="color"
                    className="upup-ie-color-swatch"
                    value={pickerValue}
                    aria-label={`${label} picker`}
                    onChange={(e) => set(e.currentTarget.value)}
                />
                <input
                    id={id}
                    type="text"
                    className="upup-ie-color-hex"
                    value={current}
                    placeholder={placeholder ?? defaultValue ?? '#3b82f6'}
                    onChange={(e) => {
                        const next = e.currentTarget.value
                        set(next === '' ? undefined : normalise(next))
                    }}
                />
            </div>
        </label>
    )
}
