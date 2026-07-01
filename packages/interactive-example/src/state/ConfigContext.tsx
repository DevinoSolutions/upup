import React, { createContext, useCallback, useEffect, useMemo, useState, type ReactNode } from 'react'
import type { UpupConfig } from '../types'
import { buildDefaultConfig } from '../categories'
import { decodeConfig } from './serialize'

type ConfigContextValue = {
    config: UpupConfig
    setConfig: (next: UpupConfig | ((prev: UpupConfig) => UpupConfig)) => void
    /**
     * Apply a partial patch to the live config. Used by the AI assistant —
     * the agent emits the smallest possible diff, this merges it on top of
     * whatever the user already has set.
     *
     * Top-level keys are replaced; known nested objects (theme, imageEditor,
     * resumable) are deep-merged so the agent can tweak one nested field
     * without nuking the rest.
     */
    setConfigPatch: (patch: Partial<UpupConfig>) => void
    /** Snapshot of every declared default — lets the code generator strip values that match. */
    defaults: UpupConfig
}

export const ConfigContext = createContext<ConfigContextValue | null>(null)

const DEEP_MERGE_KEYS = new Set([
    'theme',
    'imageEditor',
    'resumable',
    'i18n',
    'cors',
    'cloudDrives',
    'folderUpload',
])

function applyPatch(prev: UpupConfig, patch: Partial<UpupConfig>): UpupConfig {
    const next: any = { ...prev }
    for (const [key, value] of Object.entries(patch)) {
        if (value === undefined) continue
        const prevVal = (prev as any)[key]
        if (
            DEEP_MERGE_KEYS.has(key) &&
            prevVal &&
            typeof prevVal === 'object' &&
            !Array.isArray(prevVal) &&
            value &&
            typeof value === 'object' &&
            !Array.isArray(value)
        ) {
            next[key] = { ...prevVal, ...value }
        } else {
            next[key] = value
        }
    }
    return next
}

export function ConfigProvider({
    children,
    initialConfig,
}: {
    children: ReactNode
    initialConfig?: UpupConfig
}) {
    const defaults = useMemo(() => buildDefaultConfig(), [])
    const [config, setConfigState] = useState<UpupConfig>(
        () => ({ ...defaults, ...(initialConfig ?? {}) }),
    )

    // Read-on-mount `?c=` permalink support (design spec §5). Runs from an
    // effect — not the useState initializer — so a server-rendered first
    // pass never diverges from the client's first render (SSR-safe, no
    // hydration mismatch). `initialConfig` still wins over anything decoded
    // from the URL. Only touches state when a `c` token is actually present;
    // otherwise the seeded defaults/initialConfig state is left alone. Reads
    // once on mount only — subsequent URL changes are not picked up.
    useEffect(() => {
        if (typeof window === 'undefined') return
        const token = new URLSearchParams(window.location.search).get('c')
        if (!token) return
        const urlConfig = decodeConfig(token)
        setConfigState({ ...defaults, ...urlConfig, ...(initialConfig ?? {}) })
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [])

    const setConfig = useCallback(
        (next: UpupConfig | ((prev: UpupConfig) => UpupConfig)) => {
            setConfigState((prev) => (typeof next === 'function' ? (next as any)(prev) : next))
        },
        [],
    )

    const setConfigPatch = useCallback((patch: Partial<UpupConfig>) => {
        setConfigState((prev) => applyPatch(prev, patch))
    }, [])

    return (
        <ConfigContext.Provider value={{ config, setConfig, setConfigPatch, defaults }}>
            {children}
        </ConfigContext.Provider>
    )
}
