import React, { useId, useRef, useState, useEffect } from 'react'
import { ChevronDown } from 'lucide-react'
import { useConfig } from '../../state/useConfig'
import { FieldLabel } from './FieldLabel'

export type ComboPreset = {
    /** Human label shown in the dropdown ("Soft card", "Images", "Friendly"). */
    label: string
    /** Actual value written to config when this preset is picked. */
    value: string
    /** Optional one-line hint shown beside the label. */
    description?: string
}

/**
 * Free-text input with a curated dropdown of presets. Presets solve
 * "wtf do I put?" for new users; the input keeps the escape hatch for
 * power users. Selecting a preset writes its value into the input —
 * users see exactly what shipped and can edit from there.
 */
export function ComboInput({
    propId,
    label,
    description,
    placeholder,
    presets,
}: {
    propId: string
    label: string
    description?: string | undefined
    placeholder?: string | undefined
    presets: ComboPreset[]
}) {
    const id = useId()
    const { value, set } = useConfig(propId)
    const [open, setOpen] = useState(false)
    const wrapperRef = useRef<HTMLDivElement>(null)

    // Close on outside click. Listening on mousedown so the click that opened
    // the popover doesn't immediately close it.
    useEffect(() => {
        if (!open) return
        function onDocClick(e: MouseEvent) {
            if (!wrapperRef.current) return
            if (!wrapperRef.current.contains(e.target as Node)) setOpen(false)
        }
        document.addEventListener('mousedown', onDocClick)
        return () => document.removeEventListener('mousedown', onDocClick)
    }, [open])

    const current = typeof value === 'string' ? value : ''
    const activePreset = presets.find((p) => p.value === current)

    return (
        <div className="upup-ie-field" ref={wrapperRef}>
            <FieldLabel id={id} label={label} description={description} />
            <div className="upup-ie-combo">
                <input
                    id={id}
                    type="text"
                    value={current}
                    placeholder={placeholder}
                    onChange={(e) => set(e.currentTarget.value || undefined)}
                    className="upup-ie-combo-input"
                />
                <button
                    type="button"
                    className="upup-ie-combo-trigger"
                    aria-haspopup="listbox"
                    aria-expanded={open}
                    aria-label={`${label} presets`}
                    onClick={() => setOpen((v) => !v)}
                >
                    <ChevronDown size={16} />
                </button>
                {open && (
                    <ul className="upup-ie-combo-popover" role="listbox">
                        {presets.map((p) => {
                            const isActive = activePreset?.value === p.value
                            return (
                                <li key={p.label} role="option" aria-selected={isActive}>
                                    <button
                                        type="button"
                                        className="upup-ie-combo-preset"
                                        data-active={isActive || undefined}
                                        onClick={() => {
                                            set(p.value || undefined)
                                            setOpen(false)
                                        }}
                                    >
                                        <span className="upup-ie-combo-preset-label">{p.label}</span>
                                        {p.description && (
                                            <span className="upup-ie-combo-preset-desc">{p.description}</span>
                                        )}
                                        {p.value && (
                                            <span className="upup-ie-combo-preset-value">{p.value}</span>
                                        )}
                                    </button>
                                </li>
                            )
                        })}
                    </ul>
                )}
            </div>
        </div>
    )
}
