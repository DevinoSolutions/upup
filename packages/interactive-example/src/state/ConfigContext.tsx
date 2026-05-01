import React, { createContext, useCallback, useMemo, useState, type ReactNode } from 'react'
import type { UpupConfig } from '../types'
import { buildDefaultConfig } from '../categories'

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

const DEEP_MERGE_KEYS = new Set(['theme', 'imageEditor', 'resumable'])

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
