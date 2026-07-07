#!/usr/bin/env node

/**
 * E2E / MinIO environment preflight.
 *
 * Usage:
 *   dotenv -e local-dev/.env.minio -- node scripts/validate-env.mjs
 *   node scripts/validate-env.mjs --example local-dev/.env.minio.example
 *
 * Validates the env vars the e2e harness needs. Prints NAMES on failure
 * (never values — some are secrets). Exits 1 on invalid.
 */

import { readFileSync } from 'node:fs'

// ── Schema (no zod — this is a zero-dep script) ─────────────────────────

const REQUIRED_STRINGS = [
    'MINIO_ROOT_USER',
    'MINIO_ROOT_PASSWORD',
    'UPUP_E2E_BUCKET',
    'UPUP_E2E_REGION',
    'UPUP_E2E_ENDPOINT',
]

const PORT_KEYS = ['UPUP_MINIO_API_PORT', 'UPUP_MINIO_CONSOLE_PORT']

function validate(vars) {
    const errors = []

    for (const key of REQUIRED_STRINGS) {
        if (!vars[key]?.trim()) {
            errors.push(`${key}: required but missing or empty`)
        }
    }

    for (const key of PORT_KEYS) {
        const val = vars[key]?.trim()
        if (!val) continue
        const port = Number(val)
        if (!Number.isInteger(port) || port < 1 || port > 65535) {
            errors.push(`${key}: must be a valid port number (got "${val}")`)
        }
        if (port === 9000 || port === 9001) {
            errors.push(
                `${key}: must NOT be 9000/9001 — reserved for other MinIO instances (got "${val}")`,
            )
        }
    }

    const endpoint = vars['UPUP_E2E_ENDPOINT']?.trim()
    if (endpoint) {
        try {
            new URL(endpoint)
        } catch {
            errors.push(`UPUP_E2E_ENDPOINT: must be a valid URL (got "${endpoint}")`)
        }
    }

    return errors
}

// ── Modes ────────────────────────────────────────────────────────────────

function parseEnvFile(path) {
    const content = readFileSync(path, 'utf-8')
    const vars = {}
    for (const line of content.split('\n')) {
        const trimmed = line.trim()
        if (!trimmed || trimmed.startsWith('#')) continue
        const eq = trimmed.indexOf('=')
        if (eq < 0) continue
        const key = trimmed.slice(0, eq).trim()
        const val = trimmed.slice(eq + 1).trim()
        vars[key] = val
    }
    return vars
}

const args = process.argv.slice(2)
const exampleIdx = args.indexOf('--example')

if (exampleIdx !== -1) {
    const examplePath = args[exampleIdx + 1]
    if (!examplePath) {
        console.error('Usage: validate-env.mjs --example <path>')
        process.exit(1)
    }
    console.log(`Validating example file: ${examplePath}`)
    const vars = parseEnvFile(examplePath)
    const errors = validate(vars)
    if (errors.length > 0) {
        console.error('[env] Invalid example file:')
        for (const e of errors) console.error(`  ${e}`)
        process.exit(1)
    }
    console.log('Example file valid.')
    process.exit(0)
}

// Default: validate process.env (loaded by dotenv-cli)
console.log('Validating MinIO/e2e environment...')
const errors = validate(process.env)
if (errors.length > 0) {
    console.error('[env] Invalid e2e environment:')
    for (const e of errors) console.error(`  ${e}`)
    process.exit(1)
}
console.log('E2e environment valid.')
