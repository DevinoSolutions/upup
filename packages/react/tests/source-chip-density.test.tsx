import { describe, it, expect } from 'vitest'
import { render } from '@testing-library/react'
import { FileSource } from '@upupjs/core'
import { UpupUploader } from '../src'

// Nine sources is one past the compact threshold (8); five is comfortably under it.
const NINE_SOURCES = [
    FileSource.LOCAL,
    FileSource.GOOGLE_DRIVE,
    FileSource.ONE_DRIVE,
    FileSource.DROPBOX,
    FileSource.BOX,
    FileSource.URL,
    FileSource.CAMERA,
    FileSource.MICROPHONE,
    FileSource.SCREEN,
]
const FIVE_SOURCES = [
    FileSource.LOCAL,
    FileSource.GOOGLE_DRIVE,
    FileSource.URL,
    FileSource.CAMERA,
    FileSource.SCREEN,
]

function renderSourceSelector(sources: FileSource[]) {
    const { container } = render(
        <UpupUploader
            provider="s3"
            serverUrl="https://example.com"
            sources={sources}
        />,
    )
    const chip = container.querySelector('[data-testid="upup-source-local"]')
    if (!chip) throw new Error('local source chip did not render')
    const iconBox = chip.querySelector('span')
    if (!iconBox) throw new Error('local source chip has no icon box')
    const glyph = iconBox.querySelector('svg')
    if (!glyph) throw new Error('local source chip has no glyph')
    return {
        chipCount: container.querySelectorAll(
            'button[data-testid^="upup-source-"]',
        ).length,
        chipClass: chip.getAttribute('class') ?? '',
        iconBoxClass: iconBox.getAttribute('class') ?? '',
        glyphClass: glyph.getAttribute('class') ?? '',
    }
}

describe('source chip density', () => {
    it('renders compact chips when more than eight sources are configured', () => {
        const { chipCount, chipClass, iconBoxClass, glyphClass } =
            renderSourceSelector(NINE_SOURCES)

        expect(chipCount).toBe(NINE_SOURCES.length)
        expect(chipClass).toContain('upup-w-[62px]')
        expect(chipClass).toContain('upup-gap-[7px]')
        expect(chipClass).not.toContain('upup-w-[66px]')
        expect(iconBoxClass).toContain('upup-h-[42px]')
        expect(glyphClass).toContain('upup-h-8')
    })

    it('renders regular chips when eight or fewer sources are configured', () => {
        const { chipCount, chipClass, iconBoxClass, glyphClass } =
            renderSourceSelector(FIVE_SOURCES)

        expect(chipCount).toBe(FIVE_SOURCES.length)
        expect(chipClass).toContain('upup-w-[66px]')
        expect(chipClass).toContain('upup-gap-[9px]')
        expect(chipClass).not.toContain('upup-w-[62px]')
        expect(iconBoxClass).toContain('upup-h-[52px]')
        expect(glyphClass).toContain('upup-h-10')
    })
})
