'use client'
import React, { useEffect, useRef, useState } from 'react'
import { ConfigProvider } from './state/ConfigContext'
import { EventLogProvider } from './state/EventLogContext'
import { Sidebar } from './sidebar/Sidebar'
import { UploaderPreview } from './preview/UploaderPreview'
import { EventLogPanel } from './preview/EventLogPanel'
import { CodeTab } from './code/CodeTab'
import { AssistantPanel } from './ai/AssistantPanel'
import { findEntry } from './categories'
import {
    BoolToggle,
    NumberInput,
    EnumSelect,
    MultiSelect,
    StringInput,
    NestedConfig,
} from './sidebar/primitives'
import type { CategoryId, InteractiveExampleProps, ToggleEntry } from './types'

function renderEntry(entry: ToggleEntry) {
    switch (entry.primitive) {
        case 'bool':
            return (
                <BoolToggle
                    key={entry.id}
                    propId={entry.id}
                    label={entry.label}
                />
            )
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
                    placeholder={
                        entry.options?.placeholder as string | undefined
                    }
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

function Shell({
    defaultExpanded,
    hiddenCategories,
    showCodeTab,
    showEventsTab,
    previewWidth,
    aiAssistant,
}: {
    defaultExpanded: NonNullable<InteractiveExampleProps['defaultExpanded']>
    hiddenCategories?: CategoryId[]
    showCodeTab: boolean
    showEventsTab: boolean
    previewWidth: number | 'auto'
    aiAssistant?: InteractiveExampleProps['aiAssistant']
}) {
    const [tab, setTab] = useState<'preview' | 'code' | 'events'>('preview')
    const aiEnabled = aiAssistant?.enabled !== false

    // Measure the main column so the sidebar + AI panel can match its height
    // (CSS can't size one grid column by another's intrinsic content). We
    // expose the value as a CSS custom property and the columns read it.
    const mainRef = useRef<HTMLDivElement>(null)
    const [colHeight, setColHeight] = useState<number | null>(null)
    useEffect(() => {
        const el = mainRef.current
        if (!el || typeof ResizeObserver === 'undefined') return
        const ro = new ResizeObserver(entries => {
            for (const e of entries) {
                setColHeight(Math.round(e.contentRect.height))
            }
        })
        ro.observe(el)
        return () => ro.disconnect()
    }, [])

    const shellStyle: React.CSSProperties | undefined = colHeight
        ? { ['--ie-side-height' as any]: `${colHeight}px` }
        : undefined

    return (
        <div
            className={`upup-ie-shell${aiEnabled ? ' has-ai' : ''}`}
            data-ai={aiEnabled ? 'on' : 'off'}
            style={shellStyle}
        >
            <Sidebar
                defaultExpanded={defaultExpanded}
                hiddenCategories={hiddenCategories}
            />
            <div ref={mainRef} className="upup-ie-main">
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
                    {showEventsTab && (
                        <button
                            type="button"
                            className={tab === 'events' ? 'is-active' : ''}
                            onClick={() => setTab('events')}
                        >
                            Events
                        </button>
                    )}
                </div>
                <div className="upup-ie-tabs-body">
                    {/* Always render UploaderPreview so the uploader stays mounted
                        across tab switches (SSE processors, upload state, etc.
                        survive). Hide it visually when another tab is active. */}
                    <div
                        style={
                            tab === 'preview' ? undefined : { display: 'none' }
                        }
                    >
                        <UploaderPreview width={previewWidth} />
                    </div>
                    {tab === 'code' && showCodeTab && <CodeTab />}
                    {tab === 'events' && showEventsTab && <EventLogPanel />}
                </div>
            </div>
            {aiEnabled && (
                <AssistantPanel
                    mastraBaseUrl={aiAssistant?.mastraBaseUrl}
                    agentId={aiAssistant?.agentId}
                />
            )}
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
        .map(id => findEntry(id))
        .filter((e): e is ToggleEntry => e != null)
    return (
        <div className="upup-ie-focus">
            <div className="upup-ie-focus-toggles">
                {entries.map(renderEntry)}
            </div>
            <UploaderPreview width={previewWidth} />
        </div>
    )
}

export function InteractiveExample({
    defaultExpanded = [],
    hiddenCategories,
    showCodeTab = true,
    showEventsTab = true,
    focus,
    initialConfig,
    previewWidth = 'auto',
    aiAssistant,
}: InteractiveExampleProps = {}) {
    return (
        <ConfigProvider initialConfig={initialConfig}>
            <EventLogProvider>
                {focus && focus.length > 0 ? (
                    <FocusMode focus={focus} previewWidth={previewWidth} />
                ) : (
                    <Shell
                        defaultExpanded={defaultExpanded}
                        hiddenCategories={hiddenCategories}
                        showCodeTab={showCodeTab}
                        showEventsTab={showEventsTab}
                        previewWidth={previewWidth}
                        aiAssistant={aiAssistant}
                    />
                )}
            </EventLogProvider>
        </ConfigProvider>
    )
}

export default InteractiveExample
