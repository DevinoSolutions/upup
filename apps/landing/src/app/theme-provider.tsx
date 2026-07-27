'use client'

import { ThemeContext } from '@/lib/contexts'
import { applyTheme, resolveTheme } from '@/lib/theme'
import { ReactNode, useEffect, useState } from 'react'

export default function ThemeProvider({ children }: { children: ReactNode }) {
    // Seeded from the real resolved theme on the client so the FIRST render
    // consumers see already matches what the pre-hydration inline script
    // painted — a `false` seed made every theme-aware consumer (the docs
    // uploader demo, the toast container) render light for one frame on a dark
    // page. On the server there is no preference to read, so it falls back to
    // light, matching the inline script's own fallback.
    const [isDarkMode, setDarkMode] = useState(
        () => typeof window !== 'undefined' && resolveTheme() === 'dark',
    )

    const switchTheme = () => {
        setDarkMode(prev => {
            const next = !prev
            applyTheme(next ? 'dark' : 'light')
            return next
        })
    }

    // The inline script already set the class pre-paint; this re-asserts it
    // from the same resolver so a client-side navigation or a storage change
    // that happened before hydration can't leave the two out of step.
    useEffect(() => {
        const theme = resolveTheme()
        setDarkMode(theme === 'dark')
        applyTheme(theme)
    }, [])

    // The Provider always renders: gating it on a `mounted` flag handed every
    // consumer the context DEFAULT (isDarkMode: false) on the first client
    // render, which is exactly the light flash the seed above removes.
    return (
        <ThemeContext.Provider value={{ isDarkMode, switchTheme }}>
            {children}
        </ThemeContext.Provider>
    )
}
