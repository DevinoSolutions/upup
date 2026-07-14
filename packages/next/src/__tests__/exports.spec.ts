import { describe, it, expect } from 'vitest'
import { readFileSync, existsSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, resolve } from 'node:path'

import * as client from '../index'
import * as server from '../server'

const distDir = resolve(dirname(fileURLToPath(import.meta.url)), '../../dist')
const read = (f: string) => readFileSync(resolve(distDir, f), 'utf8')

describe('client export surface (@upupjs/next)', () => {
    it('re-exports the uploader UI from @upupjs/react', () => {
        expect((client as Record<string, unknown>).UpupUploader).toBeDefined()
    })
})

describe('server export surface (@upupjs/next/server)', () => {
    it('exposes the handlers + helpers + token-store utils', () => {
        expect(typeof server.createUpupNextHandler).toBe('function')
        expect(typeof server.createUpupPagesHandler).toBe('function')
        expect(typeof server.defineUpupConfig).toBe('function')
        expect(typeof server.normalizeRequestOrigin).toBe('function')
        expect(typeof server.InMemoryTokenStore).toBe('function')
    })
})

describe('build output guarantees (run after build; pretest builds)', () => {
    it('emits both entries for esm + cjs + dts + styles', () => {
        for (const f of [
            'index.js',
            'index.cjs',
            'index.d.ts',
            'server.js',
            'server.cjs',
            'server.d.ts',
            'tailwind-prefixed.css',
        ]) {
            expect(existsSync(resolve(distDir, f)), `missing dist/${f}`).toBe(
                true,
            )
        }
    })

    it("preserves the 'use client' directive in the client entry", () => {
        expect(read('index.js').trimStart().startsWith('"use client"')).toBe(
            true,
        )
        expect(read('index.cjs').includes('"use client"')).toBe(true)
    })

    it('does NOT leak @aws-sdk into the client bundle', () => {
        expect(read('index.js')).not.toMatch(/@aws-sdk/)
        expect(read('index.cjs')).not.toMatch(/@aws-sdk/)
    })
})
