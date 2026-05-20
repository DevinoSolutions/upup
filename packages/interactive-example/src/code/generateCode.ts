import type { UpupConfig } from '../types'

type RawCode = { __upupRawCode: string }

const LOCALE_EXPORTS: Record<string, string> = {
    'en-US': 'enUS',
    'ar-SA': 'arSA',
    'de-DE': 'deDE',
    'es-ES': 'esES',
    'fr-FR': 'frFR',
    'ja-JP': 'jaJP',
    'ko-KR': 'koKR',
    'zh-CN': 'zhCN',
    'zh-TW': 'zhTW',
}

const LOCALE_IMPORTS = new Set(Object.values(LOCALE_EXPORTS))

function raw(code: string): RawCode {
    return { __upupRawCode: code }
}

function isRawCode(value: unknown): value is RawCode {
    return (
        typeof value === 'object' &&
        value !== null &&
        '__upupRawCode' in value &&
        typeof (value as RawCode).__upupRawCode === 'string'
    )
}

function indent(s: string, n: number): string {
    const pad = ' '.repeat(n)
    return s
        .split('\n')
        .map((l) => (l ? pad + l : l))
        .join('\n')
}

function deepEqual(a: unknown, b: unknown): boolean {
    if (Object.is(a, b)) return true
    if (typeof a !== typeof b) return false
    if (a === null || b === null) return false
    if (Array.isArray(a) && Array.isArray(b)) {
        if (a.length !== b.length) return false
        return a.every((x, i) => deepEqual(x, b[i]))
    }
    if (typeof a === 'object' && typeof b === 'object') {
        const ka = Object.keys(a as Record<string, unknown>)
        const kb = Object.keys(b as Record<string, unknown>)
        if (ka.length !== kb.length) return false
        return ka.every((k) => deepEqual((a as any)[k], (b as any)[k]))
    }
    return false
}

function isPlainObject(v: unknown): v is Record<string, unknown> {
    return typeof v === 'object' && v !== null && !Array.isArray(v)
}

// Recursively strip keys that match their declared default. For nested
// plain objects we descend so setting one leaf (e.g. theme.slots.X) doesn't
// pull sibling defaults (theme.mode, theme.tokens) into the output.
function diffAgainstDefaults(
    value: unknown,
    defaultValue: unknown,
): { omit: true } | { omit: false; value: unknown } {
    if (deepEqual(value, defaultValue)) return { omit: true }
    if (isPlainObject(value) && isPlainObject(defaultValue)) {
        const out: Record<string, unknown> = {}
        for (const [k, v] of Object.entries(value)) {
            const res = diffAgainstDefaults(v, defaultValue[k])
            if (!res.omit) out[k] = res.value
        }
        if (Object.keys(out).length === 0) return { omit: true }
        return { omit: false, value: out }
    }
    return { omit: false, value }
}

function renderObjectLiteral(value: unknown, depth = 1): string {
    if (isRawCode(value)) return value.__upupRawCode
    if (value === null || typeof value !== 'object') {
        if (typeof value === 'string') return `'${value.replace(/'/g, "\\'")}'`
        return JSON.stringify(value)
    }
    if (Array.isArray(value)) {
        return (
            '[\n' +
            value.map((v) => indent(renderObjectLiteral(v, depth + 1), 2)).join(',\n') +
            '\n]'
        )
    }
    const entries = Object.entries(value as Record<string, unknown>).filter(
        ([, v]) => v !== undefined,
    )
    return (
        '{\n' +
        entries
            .map(([k, v]) => {
                const safeKey = /^[a-zA-Z_$][a-zA-Z0-9_$]*$/.test(k) ? k : `'${k}'`
                return indent(`${safeKey}: ${renderObjectLiteral(v, depth + 1)}`, 2)
            })
            .join(',\n') +
        '\n}'
    )
}

function isMeaningful(value: unknown): boolean {
    if (value === undefined || value === null || value === '') return false
    if (Array.isArray(value) && value.length === 0) return false
    if (typeof value === 'object' && !Array.isArray(value)) {
        return Object.values(value as Record<string, unknown>).some((v) => isMeaningful(v))
    }
    return true
}

function renderProp(key: string, value: unknown): string | null {
    if (!isMeaningful(value)) return null
    if (isRawCode(value)) return `${key}={${value.__upupRawCode}}`
    if (value === true) return key
    if (value === false) return `${key}={false}`
    if (typeof value === 'string') return `${key}="${value.replace(/"/g, '&quot;')}"`
    if (typeof value === 'number') return `${key}={${value}}`
    return `${key}={${renderObjectLiteral(value, 1)}}`
}

function collectCoreImports(value: unknown, imports: Set<string>): void {
    if (isRawCode(value)) {
        if (LOCALE_IMPORTS.has(value.__upupRawCode)) imports.add(value.__upupRawCode)
        return
    }

    if (Array.isArray(value)) {
        value.forEach((item) => collectCoreImports(item, imports))
        return
    }

    if (isPlainObject(value)) {
        Object.values(value).forEach((item) => collectCoreImports(item, imports))
    }
}

function parseOrigins(value: unknown): string[] | undefined {
    if (Array.isArray(value)) {
        return value.filter((item): item is string => typeof item === 'string' && item.trim() !== '')
    }
    if (typeof value !== 'string') return undefined
    const origins = value
        .split(/[,\n]/)
        .map((item) => item.trim())
        .filter(Boolean)
    return origins.length > 0 ? origins : undefined
}

function normalizeFolderUpload(value: unknown): Record<string, unknown> | undefined {
    if (!value || typeof value !== 'object' || Array.isArray(value)) return undefined
    const rawFolder = value as Record<string, unknown>
    const folder: Record<string, unknown> = { ...rawFolder }
    if (folder.allowDrop === undefined && typeof rawFolder.enabled === 'boolean') {
        folder.allowDrop = rawFolder.enabled
    }
    if (folder.showSelectFolderButton === undefined && typeof rawFolder.showPickerButton === 'boolean') {
        folder.showSelectFolderButton = rawFolder.showPickerButton
    }
    delete folder.enabled
    delete folder.showPickerButton
    return folder
}

function normalizeForCode(config: UpupConfig): { config: UpupConfig; coreImports: string[] } {
    const out: Record<string, unknown> = { ...config }
    const coreImports = new Set<string>()
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

    const i18n = out.i18n as Record<string, unknown> | undefined
    if (i18n && typeof i18n === 'object' && !Array.isArray(i18n)) {
        const nextI18n = { ...i18n }
        for (const key of ['locale', 'fallbackLocale'] as const) {
            const value = nextI18n[key]
            if (typeof value === 'string' && LOCALE_EXPORTS[value]) {
                nextI18n[key] = raw(LOCALE_EXPORTS[value])
                coreImports.add(LOCALE_EXPORTS[value])
            }
        }
        out.i18n = nextI18n
    }

    const cors = out.cors as Record<string, unknown> | undefined
    if (cors && typeof cors === 'object' && !Array.isArray(cors)) {
        const nextCors = { ...cors }
        const origins = parseOrigins(nextCors.allowedOrigins)
        if (origins) nextCors.allowedOrigins = origins
        else delete nextCors.allowedOrigins
        out.cors = nextCors
    }

    const folderUpload = normalizeFolderUpload(out.folderUpload)
    if (folderUpload) out.folderUpload = folderUpload

    return { config: out as UpupConfig, coreImports: [...coreImports].sort() }
}

export function generateCode(config: UpupConfig, defaults: UpupConfig = {}): string {
    const normalized = normalizeForCode(config)
    const normalizedDefaults = normalizeForCode(defaults)
    const events = (normalized.config as any).events as Record<string, boolean> | undefined
    const configWithoutEvents: Record<string, unknown> = { ...normalized.config }
    delete (configWithoutEvents as any).events
    const coreImports = new Set<string>()

    // Drop every key whose value matches the declared default, descending into
    // nested objects so setting one leaf doesn't drag sibling defaults along.
    const propLines = Object.entries(configWithoutEvents)
        .map(([k, v]) => {
            const res = diffAgainstDefaults(v, (normalizedDefaults.config as Record<string, unknown>)[k])
            if (!res.omit) collectCoreImports(res.value, coreImports)
            return res.omit ? null : renderProp(k, res.value)
        })
        .filter((s): s is string => s != null)

    const eventLines: string[] = []
    if (events) {
        for (const [handler, on] of Object.entries(events)) {
            if (on) {
                if (handler === 'onPrepareFiles') {
                    eventLines.push(`${handler}={(files, ...args) => { console.log('${handler}', files, ...args); return files }}`)
                } else {
                    eventLines.push(`${handler}={(...args) => console.log('${handler}', ...args)}`)
                }
            }
        }
    }

    const allLines = [...propLines, ...eventLines]
    const propsBlock = allLines.length === 0 ? '' : '\n' + indent(allLines.join('\n'), 6)
    const coreImportNames = [...coreImports].sort()
    const coreImport = coreImportNames.length > 0
        ? `import { ${coreImportNames.join(', ')} } from '@upup/core'\n`
        : ''

    return `import { UpupUploader } from '@upup/react'
import '@upup/react/styles'
${coreImport}

export default function App() {
  return (
    <UpupUploader${propsBlock}
    />
  )
}
`
}
