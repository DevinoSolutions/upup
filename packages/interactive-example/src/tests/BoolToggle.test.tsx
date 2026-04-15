import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import React from 'react'
import { ConfigProvider } from '../state/ConfigContext'
import { BoolToggle } from '../sidebar/primitives/BoolToggle'

function Wrapped(props: { propId: string; initial?: boolean }) {
    return (
        <ConfigProvider initialConfig={{ [props.propId]: props.initial } as any}>
            <BoolToggle propId={props.propId} label="Test Label" />
        </ConfigProvider>
    )
}

describe('BoolToggle', () => {
    it('renders label text', () => {
        render(<Wrapped propId="mini" />)
        expect(screen.getByText('Test Label')).toBeTruthy()
    })

    it('reflects true initial value as checked', () => {
        render(<Wrapped propId="mini" initial={true} />)
        const input = screen.getByRole('checkbox') as HTMLInputElement
        expect(input.checked).toBe(true)
    })

    it('reflects false/undefined initial value as unchecked', () => {
        render(<Wrapped propId="mini" />)
        expect((screen.getByRole('checkbox') as HTMLInputElement).checked).toBe(false)
    })

    it('clicking toggles the value', async () => {
        const user = userEvent.setup()
        render(<Wrapped propId="mini" initial={false} />)
        const input = screen.getByRole('checkbox') as HTMLInputElement
        await user.click(input)
        expect(input.checked).toBe(true)
    })
})
