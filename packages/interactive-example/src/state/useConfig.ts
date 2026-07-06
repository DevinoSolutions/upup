import { useContext, useCallback } from 'react'
import { ConfigContext } from './ConfigContext'
import type { UpupConfig } from '../types'

function getPath(obj: unknown, path: string): unknown {
    return path.split('.').reduce<any>((acc, key) => {
        if (acc == null) return undefined
        return acc[key]
    }, obj)
}

function setPath(obj: UpupConfig, path: string, value: unknown): UpupConfig {
    const keys = path.split('.')
    const next: any = { ...obj }
    let cursor = next
    for (let i = 0; i < keys.length - 1; i++) {
        const k = keys[i]
        if (k === undefined) continue
        cursor[k] = { ...(cursor[k] ?? {}) }
        cursor = cursor[k]
    }
    const lastKey = keys[keys.length - 1]
    if (lastKey !== undefined) cursor[lastKey] = value
    if (keys[0] === 'folderUpload' && next.folderUpload && typeof next.folderUpload === 'object') {
        delete next.folderUpload.enabled
        delete next.folderUpload.showPickerButton
    }
    return next
}

export function useConfig(path: string) {
    const ctx = useContext(ConfigContext)
    if (!ctx) {
        throw new Error('useConfig must be used inside <ConfigProvider>')
    }
    const value = getPath(ctx.config, path)
    const set = useCallback(
        (next: unknown) => ctx.setConfig((prev) => setPath(prev, path, next)),
        [ctx.setConfig, path],
    )
    return { value, set, config: ctx.config }
}
