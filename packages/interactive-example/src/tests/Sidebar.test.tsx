import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import React from 'react'
import { ConfigProvider } from '../state/ConfigContext'
import { Sidebar } from '../sidebar/Sidebar'

describe('Sidebar', () => {
    it('renders simple category headers and reveals advanced headers on demand', async () => {
        render(
            <ConfigProvider initialConfig={{}}>
                <Sidebar defaultExpanded={[]} />
            </ConfigProvider>,
        )
        for (const label of ['Upload', 'Sources', 'Limits', 'Appearance']) {
            expect(screen.getByText(label)).toBeTruthy()
        }
        expect(screen.queryByText('Processing')).toBeNull()

        await userEvent.click(screen.getByRole('tab', { name: /advanced/i }))

        for (const label of [
            'Processing',
            'Editor',
            'Behavior',
            'Language',
            'Events',
            'Advanced — self-host',
        ]) {
            expect(screen.getByText(label)).toBeTruthy()
        }
    })

    it('expands only the sections listed in defaultExpanded', () => {
        render(
            <ConfigProvider initialConfig={{}}>
                <Sidebar defaultExpanded={['upload']} />
            </ConfigProvider>,
        )
        expect(screen.getByText('Provider')).toBeTruthy()
        expect(screen.queryByText('Enabled sources')).toBeNull()
    })

    it('omits categories listed in hiddenCategories even in advanced tier', async () => {
        render(
            <ConfigProvider initialConfig={{}}>
                <Sidebar defaultExpanded={[]} hiddenCategories={['editor']} />
            </ConfigProvider>,
        )
        await userEvent.click(screen.getByRole('tab', { name: /advanced/i }))
        expect(screen.queryByText('Editor')).toBeNull()
        expect(screen.getByText('Processing')).toBeTruthy()
    })
})
