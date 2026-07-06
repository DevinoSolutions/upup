import React from 'react'
import { useConfig } from '../../state/useConfig'
import type { SourceMeta } from '../../icons/source-meta'

export function MultiSelect({
    propId,
    label,
    options,
    meta,
    unavailable,
}: {
    propId: string
    label: string
    options: string[]
    /**
     * Optional per-option icon + humanised label. When present the options
     * render as brand tiles instead of plain checkboxes.
     */
    meta?: Record<string, SourceMeta> | undefined
    /**
     * Options that are visible but not selectable — each entry is a reason
     * string rendered as a tooltip. Used when a cloud-drive tile needs
     * credentials (NEXT_PUBLIC_*_CLIENT_ID) that the host env never set.
     */
    unavailable?: Record<string, string> | undefined
}) {
    const { value, set } = useConfig(propId)
    const selected = Array.isArray(value) ? (value as string[]) : []

    function toggle(opt: string) {
        const isSelected = selected.includes(opt)
        const isDisabled = Boolean(unavailable?.[opt])
        // Disabled options that aren't currently selected are no-ops — the
        // user can't opt into a source that lacks credentials. Disabled +
        // selected options stay toggleable OFF so users who don't want a
        // drive in their config can still remove it.
        if (isDisabled && !isSelected) return
        const next = isSelected
            ? selected.filter((s) => s !== opt)
            : [...selected, opt]
        set(next.length === 0 ? undefined : next)
    }

    if (meta) {
        return (
            <div className="upup-ie-field">
                <span className="upup-ie-field-label">{label}</span>
                <div className="upup-ie-source-grid">
                    {options.map((o) => {
                        const entry = meta[o]
                        const Icon = entry?.Icon
                        const labelText = entry?.label ?? o
                        const reason = unavailable?.[o]
                        const isDisabled = Boolean(reason)
                        const isSelected = selected.includes(o)
                        return (
                            <button
                                key={o}
                                type="button"
                                className="upup-ie-source-tile"
                                data-active={isSelected || undefined}
                                data-unavailable={isDisabled || undefined}
                                aria-pressed={isSelected}
                                aria-disabled={isDisabled && !isSelected ? true : undefined}
                                title={reason ?? labelText}
                                onClick={() => toggle(o)}
                            >
                                {Icon ? (
                                    <span className="upup-ie-source-tile-icon"><Icon /></span>
                                ) : null}
                                <span className="upup-ie-source-tile-label">{labelText}</span>
                            </button>
                        )
                    })}
                </div>
            </div>
        )
    }

    return (
        <div className="upup-ie-field">
            <span className="upup-ie-field-label">{label}</span>
            <div className="upup-ie-multiselect">
                {options.map((o) => {
                    const reason = unavailable?.[o]
                    const isDisabled = Boolean(reason)
                    const isSelected = selected.includes(o)
                    return (
                        <label
                            key={o}
                            className="upup-ie-multiselect-item"
                            data-unavailable={isDisabled || undefined}
                            title={reason}
                        >
                            <input
                                type="checkbox"
                                checked={isSelected}
                                disabled={isDisabled && !isSelected}
                                onChange={() => toggle(o)}
                            />
                            <span>{o}</span>
                        </label>
                    )
                })}
            </div>
        </div>
    )
}
