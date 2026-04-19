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
    description,
}: {
    propId: string
    label: string
    min?: number
    max?: number
    step?: number
    /** Declared default — shown as placeholder so consumers know the baseline. */
    defaultValue?: number
    /** 'slider' renders a range input with a live readout (for 0-1 style props). */
    display?: 'number' | 'slider'
    description?: string
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
        const readout = value == null ? '—' : String(value)
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
