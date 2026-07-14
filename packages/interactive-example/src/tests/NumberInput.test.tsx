import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import React from 'react'
import { ConfigProvider } from '../state/ConfigContext'
import { NumberInput } from '../sidebar/primitives/NumberInput'

describe('NumberInput', () => {
    it('renders with initial value', () => {
        render(
            <ConfigProvider initialConfig={{ limit: 10 } as any}>
                <NumberInput propId="limit" label="Limit" min={1} max={100} />
            </ConfigProvider>,
        )
        expect((screen.getByRole('spinbutton') as HTMLInputElement).value).toBe('10')
    })

    it('updates on change', async () => {
        const user = userEvent.setup()
        render(
            <ConfigProvider initialConfig={{ limit: 10 } as any}>
                <NumberInput propId="limit" label="Limit" min={1} max={100} />
            </ConfigProvider>,
        )
        const input = screen.getByRole('spinbutton')
        await user.clear(input)
        await user.type(input, '25')
        expect((input as HTMLInputElement).value).toBe('25')
    })

    it('clamps to min when value would be below', async () => {
        const user = userEvent.setup()
        render(
            <ConfigProvider initialConfig={{ limit: 10 } as any}>
                <NumberInput propId="limit" label="Limit" min={5} max={100} />
            </ConfigProvider>,
        )
        const input = screen.getByRole('spinbutton')
        await user.clear(input)
        await user.type(input, '2')
        await user.tab()
        expect((input as HTMLInputElement).value).toBe('5')
    })
})
