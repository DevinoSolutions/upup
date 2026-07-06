import React, { useId, useState, useEffect } from 'react'
import { useConfig } from '../../state/useConfig'
import { FieldLabel } from './FieldLabel'

export function NumberInput({
    propId,
    label,
    min,
    max,
    step = 1,
    defaultValue,
    display,
    format,
    description,
}: {
    propId: string
    label: string
    min?: number | undefined
    max?: number | undefined
    step?: number | undefined
    /** Declared default — shown as placeholder so consumers know the baseline. */
    defaultValue?: number | undefined
    /** 'slider' renders a range input with a live readout (for 0-1 style props). */
    display?: 'number' | 'slider' | undefined
    /**
     * 'percent' renders the slider readout as `Math.round(v*100) + '%'` so a
     * 0-1 value is visually anchored to a 0–100% range without changing what
     * gets stored on the underlying numeric prop.
     */
    format?: 'percent' | undefined
    description?: string | undefined
}) {
    const id = useId()
    const { value, set } = useConfig(propId)
    const [local, setLocal] = useState(value == null ? '' : String(value))

    useEffect(() => {
        setLocal(value == null ? '' : String(value))
    }, [value])

    function commit(raw: string) {
        if (raw === '') {
            set(undefined)
            return
        }
        let n = Number(raw)
        if (Number.isNaN(n)) n = min ?? 0
        if (min != null && n < min) n = min
        if (max != null && n > max) n = max
        setLocal(String(n))
        set(n)
    }

    if (display === 'slider' && min != null && max != null) {
        const sliderValue = value == null ? (defaultValue ?? min) : Number(value)
        const numericValue = value == null ? null : Number(value)
        const readout =
            numericValue == null
                ? '—'
                : format === 'percent'
                    ? `${Math.round(numericValue * 100)}%`
                    : String(numericValue)
        return (
            <div className="upup-ie-field">
                <FieldLabel label={label} description={description} />
                <div className="upup-ie-range">
                    <input
                        id={id}
                        type="range"
                        min={min}
                        max={max}
                        step={step}
                        value={sliderValue}
                        onChange={(e) => commit(e.currentTarget.value)}
                    />
                    <span className="upup-ie-range-readout">{readout}</span>
                </div>
            </div>
        )
    }

    return (
        <label htmlFor={id} className="upup-ie-field">
            <FieldLabel label={label} description={description} />
            <input
                id={id}
                type="number"
                min={min}
                max={max}
                step={step}
                value={local}
                placeholder={defaultValue != null ? String(defaultValue) : undefined}
                onChange={(e) => setLocal(e.currentTarget.value)}
                onBlur={(e) => commit(e.currentTarget.value)}
            />
        </label>
    )
}
