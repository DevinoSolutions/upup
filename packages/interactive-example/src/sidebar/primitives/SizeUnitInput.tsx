import React, { useId, useState, useEffect } from 'react'
import { useConfig } from '../../state/useConfig'

const UNITS = ['B', 'KB', 'MB', 'GB'] as const
type Unit = typeof UNITS[number]
const MULT: Record<Unit, number> = { B: 1, KB: 1024, MB: 1024 * 1024, GB: 1024 * 1024 * 1024 }

/**
 * Decompose a raw byte count into the largest unit that yields an integer
 * size, so 5_242_880 → { size: 5, unit: 'MB' } and 1500 → { size: 1500, unit: 'B' }.
 */
function bytesToSizeUnit(bytes: number): { size: number; unit: Unit } {
    for (const u of ['GB', 'MB', 'KB'] as Unit[]) {
        const m = MULT[u]
        if (bytes >= m && bytes % m === 0) return { size: bytes / m, unit: u }
    }
    return { size: bytes, unit: 'B' }
}

/**
 * Combined Size + Unit input rendered on a single row. Collapses the
 * three file-size fieldsets (max/min/maxTotal) from ~180px each down
 * to ~80px.
 */
export function SizeUnitInput({
    propId,
    label,
    defaultSize = 100,
    defaultUnit = 'MB',
    placeholder,
    serialize = 'object',
}: {
    propId: string
    label: string
    defaultSize?: number
    defaultUnit?: Unit
    placeholder?: string
    /**
     * 'object' (default) writes `{ size, unit }` to config — what the v2
     * file-size props expect. 'bytes' multiplies size×unit and writes a raw
     * number, used for props like `chunkSizeBytes` whose API takes a plain
     * number but whose UX still benefits from a unit picker.
     */
    serialize?: 'object' | 'bytes'
}) {
    const groupId = useId()
    const inputId = useId()
    const { value, set } = useConfig(propId)

    const isBytes = serialize === 'bytes'
    const objValue = (value ?? {}) as { size?: number; unit?: Unit }
    const derived = isBytes && typeof value === 'number' ? bytesToSizeUnit(value) : null
    // Track the user's chosen unit in bytes mode so picking "MB" doesn't
    // snap back to "KB" for sub-MB values on every keystroke.
    const [byteUnit, setByteUnit] = useState<Unit>(derived?.unit ?? defaultUnit)
    useEffect(() => {
        if (isBytes && derived) setByteUnit(derived.unit)
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [value])

    const size: number | '' = isBytes
        ? (derived ? derived.size : '')
        : (objValue.size ?? '')
    const unit: string = isBytes ? byteUnit : (objValue.unit ?? '')

    const update = (next: { size?: number; unit?: string }) => {
        if (!isBytes) {
            const merged = { size: objValue.size, unit: objValue.unit, ...next }
            if (merged.size === undefined && !merged.unit) {
                set(undefined)
                return
            }
            set(merged)
            return
        }
        // bytes mode: combine into a single numeric byte count.
        const nextSize = next.size !== undefined ? next.size : (typeof size === 'number' ? size : undefined)
        const nextUnitRaw = (next.unit !== undefined ? next.unit : unit) as Unit | ''
        const nextUnit = (nextUnitRaw || defaultUnit) as Unit
        if (next.unit !== undefined) setByteUnit(nextUnit)
        if (nextSize === undefined) {
            set(undefined)
            return
        }
        set(nextSize * MULT[nextUnit])
    }

    return (
        <div className="upup-ie-field">
            <span id={groupId} className="upup-ie-field-label">{label}</span>
            <div className="upup-ie-size-unit" role="group" aria-labelledby={groupId}>
                <input
                    id={inputId}
                    className="upup-ie-size-unit-input"
                    type="number"
                    min={0}
                    aria-label={`${label} — size`}
                    value={size === undefined ? '' : size}
                    placeholder={placeholder ?? String(defaultSize)}
                    onChange={(e) => {
                        const raw = e.currentTarget.value
                        if (raw === '') {
                            update({ size: undefined })
                            return
                        }
                        const n = Number(raw)
                        if (!Number.isNaN(n)) update({ size: n, unit: unit || defaultUnit })
                    }}
                />
                <div className="upup-ie-size-unit-segmented">
                    {UNITS.map((u) => {
                        const active = unit === u
                        return (
                            <button
                                key={u}
                                type="button"
                                role="radio"
                                aria-checked={active}
                                data-active={active || undefined}
                                className="upup-ie-segmented-option upup-ie-size-unit-option"
                                onClick={() => update({ unit: active ? undefined : u })}
                            >
                                {u}
                            </button>
                        )
                    })}
                </div>
            </div>
        </div>
    )
}
