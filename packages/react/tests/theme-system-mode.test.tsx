import { afterEach, describe, expect, it, vi } from 'vitest'
import { render, waitFor } from '@testing-library/react'
import React from 'react'
import { UpupUploader } from '../src'

function mockSystemTheme(matchesDark: boolean) {
    vi.stubGlobal(
        'matchMedia',
        vi.fn((query: string) => ({
            matches: matchesDark,
            media: query,
            onchange: null,
            addEventListener: vi.fn(),
            removeEventListener: vi.fn(),
            addListener: vi.fn(),
            removeListener: vi.fn(),
            dispatchEvent: vi.fn(),
        })),
    )
}

describe('theme.mode="system"', () => {
    afterEach(() => {
        vi.unstubAllGlobals()
    })

    it('resolves system dark preference before deriving component theme classes', async () => {
        mockSystemTheme(true)

        const { container } = render(
            <UpupUploader
                provider="aws"
                serverUrl="https://example.com"
                theme={{ mode: 'system' }}
            />,
        )

        await waitFor(() => {
            const uploader = container.querySelector(
                '[data-testid="upup-container"]',
            )
            expect(uploader?.className).toContain('upup-bg-[#232323]')
        })
    })
})
