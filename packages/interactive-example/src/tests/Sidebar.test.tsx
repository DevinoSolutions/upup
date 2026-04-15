import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import React from 'react'
import { ConfigProvider } from '../state/ConfigContext'
import { Sidebar } from '../sidebar/Sidebar'

describe('Sidebar', () => {
    it('renders all 9 category headers', () => {
        render(
            <ConfigProvider initialConfig={{}}>
                <Sidebar defaultExpanded={[]} />
            </ConfigProvider>,
        )
        for (const label of ['Upload', 'Sources', 'Limits', 'Processing', 'Editor', 'Behavior', 'Appearance', 'Language', 'Events']) {
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
})
