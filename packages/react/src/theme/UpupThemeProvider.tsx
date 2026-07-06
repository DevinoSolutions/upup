'use client'
import React, { useEffect, useState } from 'react'
import { resolveTheme, tokensToVars } from '@upup/core'
import type { UpupThemeConfig } from '@upup/core'

interface UpupThemeProviderProps {
    theme?: UpupThemeConfig | undefined
    children: React.ReactNode
}

export function UpupThemeProvider({ theme, children }: UpupThemeProviderProps) {
    const resolved = resolveTheme(theme)
    const cssVars = tokensToVars(resolved.tokens)

    // SSR-safe: when `mode === 'system'`, start with 'light' on both server and
    // client-first-render (identical HTML → no hydration mismatch), then read the
    // real `prefers-color-scheme` after mount and stay subscribed to changes.
    const [resolvedMode, setResolvedMode] = useState<'light' | 'dark'>(
        resolved.mode === 'system' ? 'light' : resolved.mode,
    )

    useEffect(() => {
        if (resolved.mode !== 'system') {
            setResolvedMode(resolved.mode)
            return
        }
        if (
            typeof window === 'undefined' ||
            typeof window.matchMedia !== 'function'
        ) {
            return
        }
        const mq = window.matchMedia('(prefers-color-scheme: dark)')
        const apply = () => setResolvedMode(mq.matches ? 'dark' : 'light')
        apply()
        mq.addEventListener?.('change', apply)
        return () => mq.removeEventListener?.('change', apply)
    }, [resolved.mode])

    return (
        <div
            data-theme={resolvedMode}
            style={
                {
                    display: 'block',
                    width: '100%',
                    height: '100%',
                    ...cssVars,
                } as React.CSSProperties
            }
        >
            {children}
        </div>
    )
}
