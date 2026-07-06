import { FileSource } from '../types/file-source'
import { LOCALE_META } from '../i18n/locale-meta'
import type { LocaleBundle } from '../i18n/types'

export function getDir(
    locale: string | LocaleBundle | undefined,
): 'ltr' | 'rtl' {
    if (locale && typeof locale === 'object' && 'dir' in locale)
        return locale.dir
    const code = typeof locale === 'string' ? locale : 'en-US'
    const base = code.split('-')[0] ?? ''
    const meta =
        LOCALE_META[code] ??
        Object.values(LOCALE_META).find(m => m.code.startsWith(base + '-'))
    return meta?.dir ?? 'ltr'
}

export function normalizeSource(source: string): FileSource | undefined {
    return (Object.values(FileSource) as string[]).includes(source)
        ? (source as FileSource)
        : undefined
}

export const DEFAULT_SOURCES = [
    FileSource.LOCAL,
    FileSource.URL,
    FileSource.CAMERA,
    FileSource.MICROPHONE,
    FileSource.SCREEN,
]

export const DEFAULT_MAX_FILE_SIZE = { size: 1, unit: 'GB' as const }
