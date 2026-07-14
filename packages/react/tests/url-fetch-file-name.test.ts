import { describe, expect, it } from 'vitest'
import { deriveFetchedFileName } from '../src/hooks/useFetchFileByUrl'

function response(headers: Record<string, string> = {}) {
    return new Response('ok', { status: 200, headers })
}

describe('URL source file naming', () => {
    it('preserves the last URL path segment as the fetched file name', () => {
        const blob = new Blob(['hello'], { type: 'text/plain' })

        expect(
            deriveFetchedFileName(
                'https://cdn.example.com/files/source.txt?signature=abc',
                response({ 'content-type': 'text/plain' }),
                blob,
            ),
        ).toBe('source.txt')
    })

    it('prefers content-disposition filenames over URL path names', () => {
        const blob = new Blob(['hello'], { type: 'text/plain' })

        expect(
            deriveFetchedFileName(
                'https://cdn.example.com/files/download',
                response({
                    'content-disposition':
                        'attachment; filename="report final.txt"',
                    'content-type': 'text/plain',
                }),
                blob,
            ),
        ).toBe('report final.txt')
    })

    it('uses MIME-aware extensions for generated fallback names', () => {
        const blob = new Blob(['hello'], { type: 'text/plain' })

        expect(
            deriveFetchedFileName(
                'data:text/plain,hello',
                response({ 'content-type': 'text/plain' }),
                blob,
            ),
        ).toMatch(/\.txt$/)
    })

    it('falls back safely when URL path escaping is malformed', () => {
        const blob = new Blob(['hello'], { type: 'text/plain' })

        expect(
            deriveFetchedFileName(
                'https://cdn.example.com/files/bad%escape.txt',
                response({ 'content-type': 'text/plain' }),
                blob,
            ),
        ).toBe('bad%escape.txt')
    })
})
