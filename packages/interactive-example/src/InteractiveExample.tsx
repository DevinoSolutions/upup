'use client'
import React, { useContext, useEffect, useMemo, useState } from 'react'
import { ConfigProvider, ConfigContext } from './state/ConfigContext'
import { EventLogProvider } from './state/EventLogContext'
import { Sidebar } from './sidebar/Sidebar'
import { UploaderPreview } from './preview/UploaderPreview'
import { EventLogPanel } from './preview/EventLogPanel'
import { CodeTab } from './code/CodeTab'
import { findEntry } from './categories'
import {
    BoolToggle,
    NumberInput,
    EnumSelect,
    MultiSelect,
    StringInput,
    NestedConfig,
} from './sidebar/primitives'
import {
    readConfigFromUrl,
    writeConfigToUrl,
    buildPermalink,
} from './state/url-sync'
import type { InteractiveExampleProps, ToggleEntry } from './types'

function renderEntry(entry: ToggleEntry) {
    switch (entry.primitive) {
        case 'bool':
            return <BoolToggle key={entry.id} propId={entry.id} label={entry.label} />
        case 'number':
            return (
                <NumberInput
                    key={entry.id}
                    propId={entry.id}
                    label={entry.label}
                    min={entry.options?.min as number | undefined}
                    max={entry.options?.max as number | undefined}
                    step={entry.options?.step as number | undefined}
                />
            )
        case 'enum':
            return (
                <EnumSelect
                    key={entry.id}
                    propId={entry.id}
                    label={entry.label}
                    options={(entry.options?.options as string[]) ?? []}
                />
            )
        case 'multi':
            return (
                <MultiSelect
                    key={entry.id}
                    propId={entry.id}
                    label={entry.label}
                    options={(entry.options?.options as string[]) ?? []}
                />
            )
        case 'string':
            return (
                <StringInput
                    key={entry.id}
                    propId={entry.id}
                    label={entry.label}
                    placeholder={entry.options?.placeholder as string | undefined}
                />
            )
        case 'nested':
            return (
                <NestedConfig
                    key={entry.id}
                    parentPath={entry.id}
                    label={entry.label}
                    fields={(entry.options?.fields as ToggleEntry[]) ?? []}
                />
            )
    }
}

function PermalinkButton() {
    const ctx = useContext(ConfigContext)
    async function copyLink() {
        if (!ctx) return
        const url = buildPermalink(ctx.config)
        try {
            await navigator.clipboard.writeText(url)
        } catch {
            // silently ignore
        }
    }
    return (
        <button type="button" onClick={copyLink} className="upup-ie-permalink">
            Copy permalink
        </button>
    )
}

function UrlSync() {
    const ctx = useContext(ConfigContext)
    useEffect(() => {
        if (!ctx) return
        const handle = setTimeout(() => {
            writeConfigToUrl(ctx.config)
        }, 250)
        return () => clearTimeout(handle)
    }, [ctx?.config])
    return null
}

function Shell({
    defaultExpanded,
    showCodeTab,
    previewWidth,
}: {
    defaultExpanded: NonNullable<InteractiveExampleProps['defaultExpanded']>
    showCodeTab: boolean
    previewWidth: number | 'auto'
}) {
    const [tab, setTab] = useState<'preview' | 'code'>('preview')
    return (
        <div className="upup-ie-shell">
            <Sidebar defaultExpanded={defaultExpanded} />
            <div className="upup-ie-main">
                <div className="upup-ie-tabs">
                    <button
                        type="button"
                        className={tab === 'preview' ? 'is-active' : ''}
                        onClick={() => setTab('preview')}
                    >
                        Preview
                    </button>
                    {showCodeTab && (
                        <button
                            type="button"
                            className={tab === 'code' ? 'is-active' : ''}
                            onClick={() => setTab('code')}
                        >
                            Code
                        </button>
                    )}
                    <span className="upup-ie-tabs-spacer" />
                    <PermalinkButton />
                </div>
                <div className="upup-ie-tabs-body">
                    {tab === 'preview' && <UploaderPreview width={previewWidth} />}
                    {tab === 'code' && showCodeTab && <CodeTab />}
                </div>
                {tab === 'preview' && <EventLogPanel />}
            </div>
        </div>
    )
}

function FocusMode({
    focus,
    previewWidth,
}: {
    focus: string[]
    previewWidth: number | 'auto'
}) {
    const entries = focus
        .map((id) => findEntry(id))
        .filter((e): e is ToggleEntry => e != null)
    return (
        <div className="upup-ie-focus">
            <div className="upup-ie-focus-toggles">{entries.map(renderEntry)}</div>
            <UploaderPreview width={previewWidth} />
        </div>
    )
}

export function InteractiveExample({
    defaultExpanded = [],
    showCodeTab = true,
    focus,
    initialConfig,
    previewWidth = 'auto',
    disableUrlSync = false,
}: InteractiveExampleProps = {}) {
    const merged = useMemo(() => {
        const fromUrl = disableUrlSync ? {} : readConfigFromUrl()
        return { ...fromUrl, ...(initialConfig ?? {}) }
    }, [disableUrlSync, initialConfig])

    return (
        <ConfigProvider initialConfig={merged}>
            <EventLogProvider>
                {!disableUrlSync && <UrlSync />}
                {focus && focus.length > 0 ? (
                    <FocusMode focus={focus} previewWidth={previewWidth} />
                ) : (
                    <Shell
                        defaultExpanded={defaultExpanded}
                        showCodeTab={showCodeTab}
                        previewWidth={previewWidth}
                    />
                )}
            </EventLogProvider>
        </ConfigProvider>
    )
}

export default InteractiveExample
