import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import React from 'react'
import { ConfigProvider } from '../state/ConfigContext'
import { NestedConfig } from '../sidebar/primitives/NestedConfig'
import type { ToggleEntry } from '../types'

const fields: ToggleEntry[] = [
    { id: 'clientId', label: 'Client ID', primitive: 'string', defaultValue: '' },
    { id: 'apiKey', label: 'API Key', primitive: 'string', defaultValue: '' },
]

describe('NestedConfig', () => {
    it('renders nested fields', () => {
        render(
            <ConfigProvider initialConfig={{}}>
                <NestedConfig parentPath="cloudDrives.googleDrive" label="Google Drive" fields={fields} />
            </ConfigProvider>,
        )
        expect(screen.getByText('Client ID')).toBeTruthy()
        expect(screen.getByText('API Key')).toBeTruthy()
    })

    it('accepts user input', async () => {
        const user = userEvent.setup()
        render(
            <ConfigProvider initialConfig={{}}>
                <NestedConfig parentPath="cloudDrives.googleDrive" label="Google Drive" fields={fields} />
            </ConfigProvider>,
        )
        const inputs = screen.getAllByRole('textbox')
        await user.type(inputs[0], 'abc123')
        expect((inputs[0] as HTMLInputElement).value).toBe('abc123')
    })
})
