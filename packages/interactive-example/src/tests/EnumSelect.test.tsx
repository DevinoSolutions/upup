import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import React from 'react'
import { ConfigProvider } from '../state/ConfigContext'
import { EnumSelect } from '../sidebar/primitives/EnumSelect'

describe('EnumSelect', () => {
    it('renders options', () => {
        render(
            <ConfigProvider initialConfig={{ provider: 's3' } as any}>
                <EnumSelect
                    propId="provider"
                    label="Provider"
                    options={['s3', 'backblaze', 'azure']}
                />
            </ConfigProvider>,
        )
        expect((screen.getByRole('combobox') as HTMLSelectElement).value).toBe('s3')
    })

    it('updates on selection change', async () => {
        const user = userEvent.setup()
        render(
            <ConfigProvider initialConfig={{ provider: 's3' } as any}>
                <EnumSelect
                    propId="provider"
                    label="Provider"
                    options={['s3', 'backblaze', 'azure']}
                />
            </ConfigProvider>,
        )
        const select = screen.getByRole('combobox') as HTMLSelectElement
        await user.selectOptions(select, 'backblaze')
        expect(select.value).toBe('backblaze')
    })
})
