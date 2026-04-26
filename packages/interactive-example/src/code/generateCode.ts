import type { UpupConfig } from '../types'

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
            .map(([k, v]) => indent(`${k}: ${renderObjectLiteral(v, depth + 1)}`, 2))
            .join(',\n') +
        '\n}'
    )
}

function isMeaningful(value: unknown): boolean {
    if (value === undefined || value === null || value === '') return false
    if (Array.isArray(value) && value.length === 0) return false
    if (typeof value === 'object' && Object.keys(value).length === 0) return false
    return true
}

function renderProp(key: string, value: unknown): string | null {
    if (!isMeaningful(value)) return null
    if (value === true) return key
    if (value === false) return null
    if (typeof value === 'string') return `${key}="${value.replace(/"/g, '&quot;')}"`
    if (typeof value === 'number') return `${key}={${value}}`
    return `${key}={${renderObjectLiteral(value, 1)}}`
}

export function generateCode(config: UpupConfig, defaults: UpupConfig = {}): string {
    const events = (config as any).events as Record<string, boolean> | undefined
    const configWithoutEvents: Record<string, unknown> = { ...config }
    delete (configWithoutEvents as any).events

    // Drop every key whose value matches the declared default, descending into
    // nested objects so setting one leaf doesn't drag sibling defaults along.
    const propLines = Object.entries(configWithoutEvents)
        .map(([k, v]) => {
            const res = diffAgainstDefaults(v, (defaults as Record<string, unknown>)[k])
            return res.omit ? null : renderProp(k, res.value)
        })
        .filter((s): s is string => s != null)

    const eventLines: string[] = []
    if (events) {
        for (const [handler, on] of Object.entries(events)) {
            if (on) {
                eventLines.push(`${handler}={(arg) => console.log('${handler}', arg)}`)
            }
        }
    }

    const allLines = [...propLines, ...eventLines]
    const propsBlock = allLines.length === 0 ? '' : '\n' + indent(allLines.join('\n'), 6)

    return `import { UpupUploader } from 'upup-react-file-uploader'
import 'upup-react-file-uploader/styles'

export default function App() {
  return (
    <UpupUploader${propsBlock}
    />
  )
}
`
}
