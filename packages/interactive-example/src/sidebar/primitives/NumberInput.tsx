import React, { useId, useState, useEffect } from 'react'
import { useConfig } from '../../state/useConfig'

export function NumberInput({
    propId,
    label,
    min,
    max,
    step = 1,
}: {
    propId: string
    label: string
    min?: number
    max?: number
    step?: number
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

    return (
        <label htmlFor={id} className="upup-ie-field">
            <span className="upup-ie-field-label">{label}</span>
            <input
                id={id}
                type="number"
                min={min}
                max={max}
                step={step}
                value={local}
                onChange={(e) => setLocal(e.currentTarget.value)}
                onBlur={(e) => commit(e.currentTarget.value)}
            />
        </label>
    )
}
