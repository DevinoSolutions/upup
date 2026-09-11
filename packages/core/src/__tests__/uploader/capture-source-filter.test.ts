import { describe, it, expect, vi, afterEach } from 'vitest'
import { normalizeUploaderOptions } from '../../uploader/normalize-options'
import { FileSource } from '../../types/file-source'
import { DEFAULT_SOURCES } from '../../orchestrator/helpers'

/**
 * #340: the DEFAULT source set hides capture sources whose output can never
 * satisfy `allowedFileTypes`. Driven through `normalizeUploaderOptions` — the
 * real wiring point every framework inherits.
 */
function sourcesFor(
    allowedFileTypes?: string,
    sources?: FileSource[],
): FileSource[] {
    return normalizeUploaderOptions({
        ...(allowedFileTypes === undefined ? {} : { allowedFileTypes }),
        ...(sources === undefined ? {} : { sources }),
    }).resolved.sources
}

describe('default capture-source filtering (#340)', () => {
    afterEach(() => {
        vi.restoreAllMocks()
    })

    it('keeps the whole default set when allowedFileTypes is absent', () => {
        expect(sourcesFor()).toEqual(DEFAULT_SOURCES)
    })

    it('keeps the whole default set for the match-all accept values', () => {
        for (const accept of ['*', '*/*']) {
            expect(sourcesFor(accept)).toEqual(DEFAULT_SOURCES)
        }
    })

    it('drops camera/microphone/screen for a document-only accept list', () => {
        expect(sourcesFor('application/pdf')).toEqual([
            FileSource.LOCAL,
            FileSource.URL,
        ])
    })

    it('keeps camera and screen but drops microphone for image/* + video/*', () => {
        expect(sourcesFor('image/*,video/*')).toEqual([
            FileSource.LOCAL,
            FileSource.URL,
            FileSource.CAMERA,
            FileSource.SCREEN,
        ])
    })

    it('image/* keeps camera only', () => {
        expect(sourcesFor('image/*')).toEqual([
            FileSource.LOCAL,
            FileSource.URL,
            FileSource.CAMERA,
        ])
    })

    it('audio/* keeps microphone only', () => {
        expect(sourcesFor('audio/*')).toEqual([
            FileSource.LOCAL,
            FileSource.URL,
            FileSource.MICROPHONE,
        ])
    })

    it('video/* keeps screen only', () => {
        expect(sourcesFor('video/*')).toEqual([
            FileSource.LOCAL,
            FileSource.URL,
            FileSource.SCREEN,
        ])
    })

    it('an exact capture MIME keeps exactly its source', () => {
        expect(sourcesFor('video/webm')).toContain(FileSource.SCREEN)
        expect(sourcesFor('video/webm')).not.toContain(FileSource.CAMERA)
        expect(sourcesFor('audio/webm')).toContain(FileSource.MICROPHONE)
        expect(sourcesFor('image/jpeg')).toContain(FileSource.CAMERA)
    })

    it('an exact image MIME the camera never emits drops camera', () => {
        expect(sourcesFor('image/svg+xml')).not.toContain(FileSource.CAMERA)
    })

    it('never filters local or url', () => {
        const kept = sourcesFor('application/pdf')
        expect(kept).toContain(FileSource.LOCAL)
        expect(kept).toContain(FileSource.URL)
    })

    it('never filters an explicitly passed sources array', () => {
        expect(
            sourcesFor('application/pdf', [
                FileSource.CAMERA,
                FileSource.MICROPHONE,
                FileSource.SCREEN,
            ]),
        ).toEqual([FileSource.CAMERA, FileSource.MICROPHONE, FileSource.SCREEN])
    })

    it('classified extension-only list: .pdf drops all three capture sources', () => {
        expect(sourcesFor('.pdf')).toEqual([FileSource.LOCAL, FileSource.URL])
    })

    it('classified extension-only list: .jpg keeps camera', () => {
        expect(sourcesFor('.jpg')).toEqual([
            FileSource.LOCAL,
            FileSource.URL,
            FileSource.CAMERA,
        ])
    })

    it('extensions match at top-level-type granularity, so .webm keeps microphone and screen', () => {
        expect(sourcesFor('.webm')).toEqual([
            FileSource.LOCAL,
            FileSource.URL,
            FileSource.MICROPHONE,
            FileSource.SCREEN,
        ])
    })

    it('fails open: one unclassifiable extension keeps everything', () => {
        expect(sourcesFor('.pdf,.zzz-not-a-real-extension')).toEqual(
            DEFAULT_SOURCES,
        )
    })

    it('fails open on an accept entry that is neither a MIME nor an extension', () => {
        expect(sourcesFor('pdf')).toEqual(DEFAULT_SOURCES)
    })

    it('an accept preset name resolves first, then filters (documents drops capture)', () => {
        expect(sourcesFor('documents')).toEqual([
            FileSource.LOCAL,
            FileSource.URL,
        ])
    })

    it('an extension-only accept preset still filters instead of failing open', () => {
        expect(sourcesFor('3d')).toEqual([FileSource.LOCAL, FileSource.URL])
    })

    it('warns once per dropped source in dev', () => {
        const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
        sourcesFor('application/pdf')
        expect(warn).toHaveBeenCalledTimes(3)
        const messages = warn.mock.calls.map(call => String(call[0]))
        expect(messages.some(m => m.includes('"camera"'))).toBe(true)
        expect(messages.some(m => m.includes('"microphone"'))).toBe(true)
        expect(messages.some(m => m.includes('"screen"'))).toBe(true)
        expect(messages[0]).toContain('application/pdf')
    })

    it('does not warn when nothing is dropped', () => {
        const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
        sourcesFor('*')
        expect(warn).not.toHaveBeenCalled()
    })
})
