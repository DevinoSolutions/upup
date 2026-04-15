import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import React from 'react'
import { ConfigProvider } from '../state/ConfigContext'
import { MultiSelect } from '../sidebar/primitives/MultiSelect'

describe('MultiSelect', () => {
    it('renders all options as checkboxes', () => {
        render(
            <ConfigProvider
                initialConfig={{ sources: ['local', 'camera'] } as any}
            >
                <MultiSelect
                    propId="sources"
                    label="Sources"
                    options={['local', 'camera', 'url']}
                />
            </ConfigProvider>,
        )
        expect(screen.getAllByRole('checkbox')).toHaveLength(3)
    })

    it('checks initially-selected options', () => {
        render(
            <ConfigProvider
                initialConfig={{ sources: ['local', 'camera'] } as any}
            >
                <MultiSelect
                    propId="sources"
                    label="Sources"
                    options={['local', 'camera', 'url']}
                />
            </ConfigProvider>,
        )
        const boxes = screen.getAllByRole('checkbox') as HTMLInputElement[]
        expect(boxes[0].checked).toBe(true)
        expect(boxes[1].checked).toBe(true)
        expect(boxes[2].checked).toBe(false)
    })

    it('toggles an option on click', async () => {
        const user = userEvent.setup()
        render(
            <ConfigProvider
                initialConfig={{ sources: ['local'] } as any}
            >
                <MultiSelect
                    propId="sources"
                    label="Sources"
                    options={['local', 'camera']}
                />
            </ConfigProvider>,
        )
        const boxes = screen.getAllByRole('checkbox') as HTMLInputElement[]
        await user.click(boxes[1])
        expect(boxes[1].checked).toBe(true)
    })
})
