import React, { useContext } from 'react'
import type { ToggleEntry } from '../../types'
import { BoolToggle } from './BoolToggle'
import { NumberInput } from './NumberInput'
import { EnumSelect } from './EnumSelect'
import { MultiSelect } from './MultiSelect'
import { StringInput } from './StringInput'
import { ComboInput, type ComboPreset } from './ComboInput'
import { SizeUnitInput } from './SizeUnitInput'
import { ENUM_META_BY_PROP } from '../../icons/provider-meta'
import { ConfigContext } from '../../state/ConfigContext'
import { isVisible } from '../../state/propPath'

export function NestedConfig({
    parentPath,
    label,
    fields,
    legendIcon,
}: {
    parentPath: string
    label: string
    fields: ToggleEntry[]
    /** Optional icon shown alongside the legend — used for cloud drive blocks. */
    legendIcon?: React.FC | undefined
}) {
    const Icon = legendIcon
    const ctx = useContext(ConfigContext)
    const config = ctx?.config ?? {}
    return (
        <fieldset className="upup-ie-nested">
            <legend className={Icon ? 'upup-ie-nested-legend-with-icon' : undefined}>
                {Icon ? <span className="upup-ie-nested-legend-icon"><Icon /></span> : null}
                <span>{label}</span>
            </legend>
            {fields.map((f) => {
                if (!isVisible(f.visibleWhen, config)) return null
                const fullPath = `${parentPath}.${f.id}`
                switch (f.primitive) {
                    case 'bool':
                        return <BoolToggle key={f.id} propId={fullPath} label={f.label} description={f.description} defaultValue={f.defaultValue as boolean | undefined} />
                    case 'number':
                        return <NumberInput key={f.id} propId={fullPath} label={f.label} description={f.description} min={f.options?.min as number | undefined} max={f.options?.max as number | undefined} step={f.options?.step as number | undefined} defaultValue={f.defaultValue as number | undefined} display={f.options?.display as 'slider' | 'number' | undefined} format={f.options?.format as 'percent' | undefined} />
                    case 'size-unit':
                        return <SizeUnitInput key={f.id} propId={fullPath} label={f.label} defaultSize={f.options?.defaultSize as number | undefined} defaultUnit={f.options?.defaultUnit as 'B' | 'KB' | 'MB' | 'GB' | undefined} serialize={f.options?.serialize as 'object' | 'bytes' | undefined} />
                    case 'enum':
                        return <EnumSelect key={f.id} propId={fullPath} label={f.label} description={f.description} options={(f.options?.options as string[]) ?? []} layout={f.options?.layout as 'segmented' | 'select' | undefined} defaultValue={f.defaultValue as string | undefined} meta={ENUM_META_BY_PROP[fullPath]} />
                    case 'multi':
                        return <MultiSelect key={f.id} propId={fullPath} label={f.label} options={(f.options?.options as string[]) ?? []} />
                    case 'string':
                        return <StringInput key={f.id} propId={fullPath} label={f.label} description={f.description} placeholder={f.options?.placeholder as string | undefined} />
                    case 'combo':
                        return <ComboInput key={f.id} propId={fullPath} label={f.label} description={f.description} placeholder={f.options?.placeholder as string | undefined} presets={(f.options?.presets as ComboPreset[]) ?? []} />
                    case 'nested':
                        return <NestedConfig key={f.id} parentPath={fullPath} label={f.label} fields={(f.options?.fields as ToggleEntry[]) ?? []} legendIcon={f.options?.legendIcon as React.FC | undefined} />
                }
            })}
        </fieldset>
    )
}
