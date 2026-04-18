import React from 'react'
import type { ToggleEntry } from '../../types'
import { BoolToggle } from './BoolToggle'
import { NumberInput } from './NumberInput'
import { EnumSelect } from './EnumSelect'
import { MultiSelect } from './MultiSelect'
import { StringInput } from './StringInput'

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
    legendIcon?: React.FC
}) {
    const Icon = legendIcon
    return (
        <fieldset className="upup-ie-nested">
            <legend className={Icon ? 'upup-ie-nested-legend-with-icon' : undefined}>
                {Icon ? <span className="upup-ie-nested-legend-icon"><Icon /></span> : null}
                <span>{label}</span>
            </legend>
            {fields.map((f) => {
                const fullPath = `${parentPath}.${f.id}`
                switch (f.primitive) {
                    case 'bool':
                        return <BoolToggle key={f.id} propId={fullPath} label={f.label} description={f.description} />
                    case 'number':
                        return <NumberInput key={f.id} propId={fullPath} label={f.label} min={f.options?.min as number | undefined} max={f.options?.max as number | undefined} step={f.options?.step as number | undefined} defaultValue={f.defaultValue as number | undefined} />
                    case 'enum':
                        return <EnumSelect key={f.id} propId={fullPath} label={f.label} options={(f.options?.options as string[]) ?? []} layout={f.options?.layout as 'segmented' | 'select' | undefined} defaultValue={f.defaultValue as string | undefined} />
                    case 'multi':
                        return <MultiSelect key={f.id} propId={fullPath} label={f.label} options={(f.options?.options as string[]) ?? []} />
                    case 'string':
                        return <StringInput key={f.id} propId={fullPath} label={f.label} placeholder={f.options?.placeholder as string | undefined} />
                    case 'nested':
                        return <NestedConfig key={f.id} parentPath={fullPath} label={f.label} fields={(f.options?.fields as ToggleEntry[]) ?? []} legendIcon={f.options?.legendIcon as React.FC | undefined} />
                }
            })}
        </fieldset>
    )
}
