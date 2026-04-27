'use client'
import React, { useContext, useEffect, useState } from 'react'
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
    const [status, setStatus] = useState<'idle' | 'copied' | 'error'>('idle')
    async function copyLink() {
        if (!ctx) return
        const url = buildPermalink(ctx.config, ctx.defaults)
        try {
            await navigator.clipboard.writeText(url)
            setStatus('copied')
        } catch {
            setStatus('error')
        }
        setTimeout(() => setStatus('idle'), 1500)
    }
    const label =
        status === 'copied' ? 'Copied!' :
        status === 'error' ? 'Copy failed' :
        'Copy permalink'
    return (
        <button
            type="button"
            onClick={copyLink}
            className="upup-ie-permalink"
            data-status={status === 'idle' ? undefined : status}
            aria-live="polite"
        >
            {label}
        </button>
    )
}

function UrlSync() {
    const ctx = useContext(ConfigContext)
    useEffect(() => {
        if (!ctx) return
        const handle = setTimeout(() => {
            writeConfigToUrl(ctx.config, ctx.defaults)
        }, 250)
        return () => clearTimeout(handle)
    }, [ctx?.config])
    return null
}

/**
 * Mount-only consumer: pulls config out of `?c=` after hydration and merges
 * it into the live config. Reading the URL during render would diverge SSR
 * (no window) from the client (full URL), and React's recovery from that
 * hydration mismatch was breaking interactivity in the playground.
 */
function UrlBootstrap() {
    const ctx = useContext(ConfigContext)
    useEffect(() => {
        if (!ctx) return
        const fromUrl = readConfigFromUrl()
        if (Object.keys(fromUrl).length === 0) return
        ctx.setConfig((prev) => ({ ...prev, ...fromUrl }))
        // Empty deps — bootstrap exactly once on mount. Subsequent URL writes
        // are owned by UrlSync.
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [])
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
    // First render must be identical on server and client — only host-passed
    // initialConfig is folded in here. URL config is bootstrapped post-mount
    // by UrlBootstrap, so SSR HTML and the client's first render agree even
    // when the URL carries a ?c= permalink.
    return (
        <ConfigProvider initialConfig={initialConfig}>
            <EventLogProvider>
                {!disableUrlSync && <UrlBootstrap />}
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
