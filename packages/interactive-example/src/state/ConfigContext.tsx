import React, { createContext, useCallback, useMemo, useState, type ReactNode } from 'react'
import type { UpupConfig } from '../types'
import { buildDefaultConfig } from '../categories'

type ConfigContextValue = {
    config: UpupConfig
    setConfig: (next: UpupConfig | ((prev: UpupConfig) => UpupConfig)) => void
    /** Snapshot of every declared default — lets the code generator strip values that match. */
    defaults: UpupConfig
}

export const ConfigContext = createContext<ConfigContextValue | null>(null)

export function ConfigProvider({
    children,
    initialConfig,
}: {
    children: ReactNode
    initialConfig?: UpupConfig
}) {
    const defaults = useMemo(() => buildDefaultConfig(), [])
    // Always start from declared defaults so the sidebar, the preview and the
    // generated code agree on the "out of the box" state. initialConfig (from
    // ?c= permalinks or presets) is layered on top.
    const [config, setConfigState] = useState<UpupConfig>(
        () => ({ ...defaults, ...(initialConfig ?? {}) }),
    )

    const setConfig = useCallback(
        (next: UpupConfig | ((prev: UpupConfig) => UpupConfig)) => {
            setConfigState((prev) => (typeof next === 'function' ? (next as any)(prev) : next))
        },
        [],
    )

    return (
        <ConfigContext.Provider value={{ config, setConfig, defaults }}>
            {children}
        </ConfigContext.Provider>
    )
}
