'use client'
import React, { useContext, useEffect, useState } from 'react'
import { UpupUploader } from 'upup-react-file-uploader'
import 'upup-react-file-uploader/styles'
import {
    en_US,
    ar_SA,
    de_DE,
    es_ES,
    fr_FR,
    ja_JP,
    ko_KR,
    zh_CN,
    zh_TW,
} from 'upup-react-file-uploader/locales'
import { ConfigContext } from '../state/ConfigContext'
import { useEventLog } from '../state/EventLogContext'

// String → locale-pack lookup. The uploader's i18n contract is: pass an
// object as `i18n.locale` to actually substitute strings; passing a string
// only flips the text direction. The playground's locale enum stores a
// string for sharable/permalink configs, so we resolve it here before
// handing the prop off to UpupUploader.
const LOCALE_PACKS: Record<string, unknown> = {
    'en-US': en_US,
    'ar-SA': ar_SA,
    'de-DE': de_DE,
    'es-ES': es_ES,
    'fr-FR': fr_FR,
    'ja-JP': ja_JP,
    'ko-KR': ko_KR,
    'zh-CN': zh_CN,
    'zh-TW': zh_TW,
}

function useMounted(): boolean {
    const [mounted, setMounted] = useState(false)
    useEffect(() => setMounted(true), [])
    return mounted
}

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

// Build `{ onXxx: (...args) => record(name, args) + console.log }` for every
// event-toggle the user has turned on. Events map into real callback props on
// UpupUploader; if this wasn't done the toggles would be spread as a
// non-existent `events={...}` prop and silently do nothing.
function eventLoggers(
    flags: Record<string, boolean> | undefined,
    record: ((name: string, args: unknown[]) => void) | undefined,
): Record<string, (...args: unknown[]) => void> {
    if (!flags) return {}
    const out: Record<string, (...args: unknown[]) => void> = {}
    for (const [name, enabled] of Object.entries(flags)) {
        if (!enabled) continue
        out[name] = (...args: unknown[]) => {
            record?.(name, args)
            // eslint-disable-next-line no-console
            console.log('[upup]', name, ...args)
        }
    }
    return out
}

export function UploaderPreview({ width = 'auto' }: { width?: number | 'auto' }) {
    const ctx = useContext(ConfigContext)
    const log = useEventLog()
    const mounted = useMounted()
    const pageIsDark = usePageThemeIsDark()
    if (!ctx) return null

    const { theme, events, i18n, ...rest } = (ctx.config as any) ?? {}
    const themeMode: 'light' | 'dark' | 'system' | undefined = theme?.mode
    const effectiveMode: 'light' | 'dark' =
        themeMode === 'dark' || themeMode === 'light'
            ? themeMode
            : pageIsDark
              ? 'dark'
              : 'light'
    const effectiveTheme = { ...(theme ?? {}), mode: effectiveMode }

    // Keep the string `i18n.locale` so the uploader's lang/dir computation
    // (RTL for ar/he/fa, BCP-47 lang attribute) keeps working on permalinks.
    // Pass the matching pack as the separate `localePack` prop so the
    // strings actually switch — the uploader's resolver picks localePack
    // when i18n.locale is a string, falling back to en_US otherwise.
    const localeStr = typeof i18n?.locale === 'string' ? i18n.locale : undefined
    const localePack = localeStr ? LOCALE_PACKS[localeStr] : undefined

    const handlers = eventLoggers(events, log?.record)
    const style = width === 'auto' ? undefined : { width: `${width}px`, maxWidth: '100%' }
    return (
        <div className="upup-ie-preview" style={style} suppressHydrationWarning>
            {mounted ? (
                <UpupUploader provider="s3" serverUrl="" {...rest} {...handlers} theme={effectiveTheme} i18n={i18n} localePack={localePack as any} />
            ) : (
                <div className="upup-ie-preview-placeholder" aria-hidden="true" />
            )}
        </div>
    )
}
