import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import React from 'react'
import { ConfigProvider } from '../state/ConfigContext'
import { StringInput } from '../sidebar/primitives/StringInput'

describe('StringInput', () => {
    it('renders with initial value', () => {
        render(
            <ConfigProvider initialConfig={{ serverUrl: '/api/upup' } as any}>
                <StringInput propId="serverUrl" label="Server URL" />
            </ConfigProvider>,
        )
        expect((screen.getByRole('textbox') as HTMLInputElement).value).toBe('/api/upup')
    })

    it('updates on change', async () => {
        const user = userEvent.setup()
        render(
            <ConfigProvider initialConfig={{ serverUrl: '' } as any}>
                <StringInput propId="serverUrl" label="Server URL" />
            </ConfigProvider>,
        )
        const input = screen.getByRole('textbox')
        await user.type(input, '/api/custom')
        expect((input as HTMLInputElement).value).toBe('/api/custom')
    })
})
