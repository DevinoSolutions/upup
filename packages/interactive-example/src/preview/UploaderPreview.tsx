'use client'
import React, { useContext, useEffect, useMemo, useState } from 'react'
import { UpupUploader } from '@upupjs/react'
import '@upupjs/react/styles'
import {
    enUS,
    arSA,
    deDE,
    esES,
    frFR,
    jaJP,
    koKR,
    zhCN,
    zhTW,
    type LocaleBundle,
} from '@upupjs/core'
import { ConfigContext } from '../state/ConfigContext'
import { useEventLog } from '../state/EventLogContext'
import type { UpupConfig } from '../types'

// String → locale-pack lookup. The uploader's i18n contract is: pass an
// object as `i18n.locale` to actually substitute strings; passing a string
// only flips the text direction. The playground's locale enum stores a
// string for sharable/permalink configs, so we resolve it here before
// handing the prop off to UpupUploader.
const LOCALE_PACKS: Record<string, LocaleBundle> = {
    'en-US': enUS,
    'ar-SA': arSA,
    'de-DE': deDE,
    'es-ES': esES,
    'fr-FR': frFR,
    'ja-JP': jaJP,
    'ko-KR': koKR,
    'zh-CN': zhCN,
    'zh-TW': zhTW,
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
        const mq =
            typeof window.matchMedia === 'function'
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
    if (
        typeof window !== 'undefined' &&
        typeof window.matchMedia === 'function'
    ) {
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
): Record<string, (...args: unknown[]) => unknown> {
    if (!flags) return {}
    const out: Record<string, (...args: unknown[]) => unknown> = {}
    for (const [name, enabled] of Object.entries(flags)) {
        if (!enabled) continue
        if (name === 'onPrepareFiles') {
            out[name] = (files: unknown, ...args: unknown[]) => {
                record?.(name, [files, ...args])
                // eslint-disable-next-line no-console
                console.log('[upup]', name, files, ...args)
                return files
            }
            continue
        }
        out[name] = (...args: unknown[]) => {
            record?.(name, args)
            // eslint-disable-next-line no-console
            console.log('[upup]', name, ...args)
        }
    }
    return out
}

function parseOrigins(value: unknown): string[] | undefined {
    if (Array.isArray(value)) {
        return value.filter(
            (item): item is string =>
                typeof item === 'string' && item.trim() !== '',
        )
    }
    if (typeof value !== 'string') return undefined
    const origins = value
        .split(/[,\n]/)
        .map(item => item.trim())
        .filter(Boolean)
    return origins.length > 0 ? origins : undefined
}

function normalizeFolderUpload(
    value: unknown,
): Record<string, unknown> | undefined {
    if (!value || typeof value !== 'object' || Array.isArray(value))
        return undefined
    const rawFolder = value as Record<string, unknown>
    const folder: Record<string, unknown> = { ...rawFolder }
    if (
        folder.allowDrop === undefined &&
        typeof rawFolder.enabled === 'boolean'
    ) {
        folder.allowDrop = rawFolder.enabled
    }
    if (
        folder.showSelectFolderButton === undefined &&
        typeof rawFolder.showPickerButton === 'boolean'
    ) {
        folder.showSelectFolderButton = rawFolder.showPickerButton
    }
    delete folder.enabled
    delete folder.showPickerButton
    return folder
}

function normalizeRuntimeConfig(config: Record<string, unknown>): UpupConfig {
    const out: Record<string, unknown> = { ...config }
    const resumable = out.resumable as Record<string, unknown> | undefined
    const usesTusEndpoint =
        resumable &&
        typeof resumable === 'object' &&
        !Array.isArray(resumable) &&
        resumable.protocol === 'tus' &&
        typeof resumable.endpoint === 'string' &&
        resumable.endpoint.trim() !== ''

    if (usesTusEndpoint) {
        delete out.uploadEndpoint
        delete out.serverUrl
    } else if (out.mode === 'server') {
        delete out.uploadEndpoint
    } else {
        delete out.serverUrl
    }

    if (out.cors && typeof out.cors === 'object' && !Array.isArray(out.cors)) {
        const cors = { ...(out.cors as Record<string, unknown>) }
        const origins = parseOrigins(cors.allowedOrigins)
        if (origins) cors.allowedOrigins = origins
        else delete cors.allowedOrigins
        out.cors = cors
    }

    const folderUpload = normalizeFolderUpload(out.folderUpload)
    if (folderUpload) out.folderUpload = folderUpload

    return out as UpupConfig
}

export function UploaderPreview({
    width = 'auto',
}: {
    width?: number | 'auto'
}) {
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
    const localeStr = typeof i18n?.locale === 'string' ? i18n.locale : undefined
    const localeBundle = localeStr ? LOCALE_PACKS[localeStr] : undefined
    const fallbackStr =
        typeof i18n?.fallbackLocale === 'string'
            ? i18n.fallbackLocale
            : undefined
    const fallbackBundle = fallbackStr ? LOCALE_PACKS[fallbackStr] : undefined
    const resolvedI18n = {
        ...i18n,
        ...(localeBundle ? { locale: localeBundle } : {}),
        ...(fallbackBundle ? { fallbackLocale: fallbackBundle } : {}),
    }

    const handlers = useMemo(
        () => eventLoggers(events, log?.record),
        [events, log?.record],
    )
    const runtimeConfig = normalizeRuntimeConfig(rest)
    const style =
        width === 'auto' ? undefined : { width: `${width}px`, maxWidth: '100%' }
    return (
        <div className="upup-ie-preview" style={style} suppressHydrationWarning>
            {mounted ? (
                <UpupUploader
                    provider="aws"
                    serverUrl=""
                    {...runtimeConfig}
                    {...handlers}
                    theme={effectiveTheme}
                    i18n={resolvedI18n}
                />
            ) : (
                <div
                    className="upup-ie-preview-placeholder"
                    aria-hidden="true"
                />
            )}
        </div>
    )
}
