import { existsSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'
import { INDEXNOW_KEY, INDEXNOW_KEY_PATH } from '@/lib/indexnow'
import { GET } from '../app/5cb30cbda540958e8d033652400e59e3.txt/route'

// IndexNow verification hinges on one brittle coupling: the App Router
// directory that serves the key file is NAMED after the key, so a change to
// the constant without the matching directory rename (or vice versa) leaves
// the site serving one key while claiming another — and every submission an
// engine receives fails ownership. These pin the two to each other, plus the
// response shape indexnow.org requires (exact body, text/plain).
describe('IndexNow key file served by the landing app', () => {
    it('key constant is 32 lowercase hexadecimal characters as IndexNow requires', () => {
        expect(INDEXNOW_KEY).toMatch(/^[0-9a-f]{32}$/)
    })

    it('key path constant is the key served as a root-level .txt file', () => {
        expect(INDEXNOW_KEY_PATH).toBe(`/${INDEXNOW_KEY}.txt`)
    })

    it('route directory on disk is named exactly after the key constant', () => {
        const appDir = fileURLToPath(new URL('../app/', import.meta.url))
        expect(existsSync(`${appDir}${INDEXNOW_KEY}.txt/route.ts`)).toBe(true)
    })

    it('GET responds with the bare key as plain text and nothing else', async () => {
        const response = GET()

        expect(response.status).toBe(200)
        expect(response.headers.get('content-type')).toBe(
            'text/plain; charset=utf-8',
        )
        await expect(response.text()).resolves.toBe(INDEXNOW_KEY)
    })
})
