import type { UpupConfig } from '../types'

function indent(s: string, n: number): string {
    const pad = ' '.repeat(n)
    return s
        .split('\n')
        .map((l) => (l ? pad + l : l))
        .join('\n')
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

export function generateCode(config: UpupConfig): string {
    const events = (config as any).events as Record<string, boolean> | undefined
    const configWithoutEvents: Record<string, unknown> = { ...config }
    delete (configWithoutEvents as any).events

    const propLines = Object.entries(configWithoutEvents)
        .map(([k, v]) => renderProp(k, v))
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
