import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import React from 'react'
import { InteractiveExample } from '../InteractiveExample'

describe('InteractiveExample', () => {
    it('renders sidebar and preview by default', () => {
        render(<InteractiveExample />)
        expect(screen.getByText('Upload')).toBeTruthy()
        expect(document.querySelector('[data-upup-slot="main-box"]')).toBeTruthy()
    })

    it('Code tab switches to show generated code', async () => {
        const user = userEvent.setup()
        render(<InteractiveExample />)
        await user.click(screen.getByRole('button', { name: /code/i }))
        expect(document.querySelector('pre')).toBeTruthy()
    })

    it('showCodeTab=false hides the Code tab', () => {
        render(<InteractiveExample showCodeTab={false} />)
        expect(screen.queryByRole('button', { name: /code/i })).toBeNull()
    })

    it('focus mode renders ONLY the specified toggles + preview, no sidebar shell', () => {
        render(<InteractiveExample focus={['mini']} />)
        expect(screen.queryByText('Upload')).toBeNull()
        expect(screen.getByText('Mini mode')).toBeTruthy()
        expect(document.querySelector('[data-upup-slot="main-box"]')).toBeTruthy()
    })

    it('defaultExpanded opens specified sections', () => {
        render(<InteractiveExample defaultExpanded={['upload']} />)
        expect(screen.getByText('Provider')).toBeTruthy()
    })
})
