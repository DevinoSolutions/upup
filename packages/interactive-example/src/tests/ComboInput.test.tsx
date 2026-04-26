import React from 'react'
import { describe, it, expect } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { ComboInput } from '../sidebar/primitives/ComboInput'
import { ConfigProvider } from '../state/ConfigContext'

function setup(presets = [{ label: 'Images', value: 'image/*' }]) {
    return render(
        <ConfigProvider initialConfig={{}}>
            <ComboInput
                propId="accept"
                label="Accept"
                placeholder="image/*"
                presets={presets}
            />
        </ConfigProvider>,
    )
}

describe('ComboInput', () => {
    it('renders the input + chevron trigger', () => {
        setup()
        expect(screen.getByPlaceholderText('image/*')).toBeTruthy()
        expect(screen.getByRole('button', { name: /accept presets/i })).toBeTruthy()
    })

    it('typing writes the value to config (free text path)', async () => {
        setup()
        const input = screen.getByPlaceholderText('image/*') as HTMLInputElement
        fireEvent.change(input, { target: { value: 'video/mp4' } })
        expect(input.value).toBe('video/mp4')
    })

    it('opens the popover on chevron click and writes the preset value when picked', async () => {
        const user = userEvent.setup()
        setup([
            { label: 'Images', value: 'image/*' },
            { label: 'Videos', value: 'video/*' },
        ])
        await user.click(screen.getByRole('button', { name: /accept presets/i }))
        // The role="option" is on the LI, but the click handler lives on the
        // inner button — click the button directly so it actually fires.
        const videos = screen.getByRole('button', { name: /videos/i })
        await user.click(videos)
        const input = screen.getByPlaceholderText('image/*') as HTMLInputElement
        expect(input.value).toBe('video/*')
    })
})
