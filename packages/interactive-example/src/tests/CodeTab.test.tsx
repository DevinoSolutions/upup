import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import React from 'react'
import { ConfigProvider } from '../state/ConfigContext'
import { CodeTab } from '../code/CodeTab'

describe('CodeTab', () => {
    it('renders generated code in a <pre>', () => {
        render(
            <ConfigProvider initialConfig={{ provider: 'backblaze' } as any}>
                <CodeTab />
            </ConfigProvider>,
        )
        const pre = document.querySelector('pre')
        expect(pre?.textContent).toContain('provider="backblaze"')
    })

    it('Copy button writes to clipboard', async () => {
        const writeText = vi.fn().mockResolvedValue(undefined)
        const user = userEvent.setup({
            writeToClipboard: false,
        } as any)
        Object.defineProperty(navigator, 'clipboard', {
            value: { writeText },
            configurable: true,
            writable: true,
        })
        render(
            <ConfigProvider initialConfig={{ provider: 'backblaze' } as any}>
                <CodeTab />
            </ConfigProvider>,
        )
        await user.click(screen.getByRole('button', { name: /copy/i }))
        expect(writeText).toHaveBeenCalledTimes(1)
        expect(writeText.mock.calls[0]?.[0]).toContain('provider="backblaze"')
    })
})
