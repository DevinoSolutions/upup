import React, { createContext, useCallback, useState, type ReactNode } from 'react'
import type { UpupConfig } from '../types'

type ConfigContextValue = {
    config: UpupConfig
    setConfig: (next: UpupConfig | ((prev: UpupConfig) => UpupConfig)) => void
}

export const ConfigContext = createContext<ConfigContextValue | null>(null)

export function ConfigProvider({
    children,
    initialConfig = {},
}: {
    children: ReactNode
    initialConfig?: UpupConfig
}) {
    const [config, setConfigState] = useState<UpupConfig>(initialConfig)

    const setConfig = useCallback(
        (next: UpupConfig | ((prev: UpupConfig) => UpupConfig)) => {
            setConfigState((prev) => (typeof next === 'function' ? (next as any)(prev) : next))
        },
        [],
    )

    return (
        <ConfigContext.Provider value={{ config, setConfig }}>
            {children}
        </ConfigContext.Provider>
    )
}
