import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import React from 'react'
import { ConfigProvider } from '../state/ConfigContext'
import { CategorySection } from '../sidebar/CategorySection'
import { uploadCategory } from '../categories/upload'

describe('CategorySection', () => {
    it('renders category label', () => {
        render(
            <ConfigProvider initialConfig={{}}>
                <CategorySection category={uploadCategory} defaultExpanded={false} />
            </ConfigProvider>,
        )
        expect(screen.getByText('Upload')).toBeTruthy()
    })

    it('body hidden when collapsed', () => {
        render(
            <ConfigProvider initialConfig={{}}>
                <CategorySection category={uploadCategory} defaultExpanded={false} />
            </ConfigProvider>,
        )
        expect(screen.queryByText('Provider')).toBeNull()
    })

    it('body visible when expanded', () => {
        render(
            <ConfigProvider initialConfig={{}}>
                <CategorySection category={uploadCategory} defaultExpanded={true} />
            </ConfigProvider>,
        )
        expect(screen.getByText('Provider')).toBeTruthy()
    })

    it('clicking header toggles expansion', async () => {
        const user = userEvent.setup()
        render(
            <ConfigProvider initialConfig={{}}>
                <CategorySection category={uploadCategory} defaultExpanded={false} />
            </ConfigProvider>,
        )
        await user.click(screen.getByText('Upload'))
        expect(screen.getByText('Provider')).toBeTruthy()
    })

    it('counter shows how many props are set', () => {
        render(
            <ConfigProvider initialConfig={{ provider: 'backblaze', maxRetries: 5 } as any}>
                <CategorySection category={uploadCategory} defaultExpanded={false} />
            </ConfigProvider>,
        )
        expect(screen.getByText(/2 set/)).toBeTruthy()
    })
})
