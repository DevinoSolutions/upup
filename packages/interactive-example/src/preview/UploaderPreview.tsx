'use client'
import React, { useContext, useEffect, useState } from 'react'
import { UpupUploader } from '@upup/react'
import '@upup/react/styles'
import { ConfigContext } from '../state/ConfigContext'

function usePageThemeIsDark(): boolean {
    const [isDark, setIsDark] = useState(() => {
        if (typeof document === 'undefined') return false
        return resolvePageTheme()
    })
    useEffect(() => {
        const update = () => setIsDark(resolvePageTheme())
        update()
        const observer = new MutationObserver(update)
        observer.observe(document.documentElement, {
            attributes: true,
            attributeFilter: ['class', 'data-theme'],
        })
        const mq = typeof window.matchMedia === 'function'
            ? window.matchMedia('(prefers-color-scheme: dark)')
            : null
        mq?.addEventListener?.('change', update)
        return () => {
            observer.disconnect()
            mq?.removeEventListener?.('change', update)
        }
    }, [])
    return isDark
}

function resolvePageTheme(): boolean {
    const html = document.documentElement
    if (html.classList.contains('dark')) return true
    if (html.classList.contains('light')) return false
    const explicit = html.getAttribute('data-theme')
    if (explicit === 'dark') return true
    if (explicit === 'light') return false
    if (typeof window !== 'undefined' && typeof window.matchMedia === 'function') {
        return window.matchMedia('(prefers-color-scheme: dark)').matches
    }
    return false
}

export function UploaderPreview({ width = 'auto' }: { width?: number | 'auto' }) {
    const ctx = useContext(ConfigContext)
    const pageIsDark = usePageThemeIsDark()
    if (!ctx) return null

    const { theme, ...rest } = (ctx.config as any) ?? {}
    const themeMode: 'light' | 'dark' | 'system' | undefined = theme?.mode
    const dark =
        themeMode === 'dark'
            ? true
            : themeMode === 'light'
              ? false
              : pageIsDark

    const style = width === 'auto' ? undefined : { width: `${width}px`, maxWidth: '100%' }
    return (
        <div className="upup-ie-preview" style={style}>
            <UpupUploader provider="s3" serverUrl="" {...rest} dark={dark} />
        </div>
    )
}
