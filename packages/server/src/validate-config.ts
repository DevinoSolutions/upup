// packages/server/src/validate-config.ts
//
// Construct-time required-field validation, folded out of @upupjs/next's opt-in
// defineUpupConfig so it runs for EVERY caller of createUpupHandler regardless
// of wrapper (F-852). A server-package factory could never import a next-
// package helper, so playground/landing — which call createUpupNextHandler
// (→ createUpupHandler) directly — previously bypassed the fail-fast entirely.
// Throws ONE UpupConfigError listing every missing/empty required field, so a
// forgotten env var (the classic `process.env.X!` -> "") fails fast and loud
// instead of surfacing as a confusing 500 at request time.

import { UpupConfigError } from '@upupjs/core'
import type { UpupServerConfig } from './config'

function isNonEmpty(v: unknown): v is string {
    return typeof v === 'string' && v.trim().length > 0
}

export function validateServerConfig(config: UpupServerConfig): void {
    const missing: string[] = []

    // Runtime guard: callers may pass partial/invalid objects at boot time.
    if (!(config as Partial<UpupServerConfig>).storage) {
        missing.push('storage')
    } else {
        if (!isNonEmpty(config.storage.bucket)) missing.push('storage.bucket')
        if (!isNonEmpty(config.storage.region)) missing.push('storage.region')
        // Both-or-neither: undefined creds are OK (IAM role), but a half-set
        // pair (the classic `process.env.X!` -> "" bug) must fail loudly.
        const hasId = config.storage.accessKeyId !== undefined
        const hasSecret = config.storage.secretAccessKey !== undefined
        if (hasId || hasSecret) {
            if (!isNonEmpty(config.storage.accessKeyId))
                missing.push('storage.accessKeyId')
            if (!isNonEmpty(config.storage.secretAccessKey))
                missing.push('storage.secretAccessKey')
        }
    }

    const p = config.providers
    if (p?.googleDrive) {
        if (!isNonEmpty(p.googleDrive.clientId))
            missing.push('providers.googleDrive.clientId')
        if (!isNonEmpty(p.googleDrive.clientSecret))
            missing.push('providers.googleDrive.clientSecret')
    }
    if (p?.dropbox) {
        if (!isNonEmpty(p.dropbox.appKey))
            missing.push('providers.dropbox.appKey')
        if (!isNonEmpty(p.dropbox.appSecret))
            missing.push('providers.dropbox.appSecret')
    }
    if (p?.oneDrive) {
        if (!isNonEmpty(p.oneDrive.clientId))
            missing.push('providers.oneDrive.clientId')
        if (!isNonEmpty(p.oneDrive.clientSecret))
            missing.push('providers.oneDrive.clientSecret')
    }
    if (p?.box) {
        if (!isNonEmpty(p.box.clientId)) missing.push('providers.box.clientId')
        if (!isNonEmpty(p.box.clientSecret))
            missing.push('providers.box.clientSecret')
    }

    if (missing.length > 0) {
        throw new UpupConfigError(
            '[@upupjs/server] Invalid config — missing/empty required field(s):\n' +
                missing.map(m => `  - ${m}`).join('\n'),
        )
    }
}
