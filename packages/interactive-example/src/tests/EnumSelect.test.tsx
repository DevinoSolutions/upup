import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import React from 'react'
import { ConfigProvider } from '../state/ConfigContext'
import { EnumSelect } from '../sidebar/primitives/EnumSelect'

describe('EnumSelect', () => {
    describe('segmented (default for ≤6 options)', () => {
        it('renders a radio button per option, with the current value marked active', () => {
            render(
                <ConfigProvider initialConfig={{ provider: 's3' } as any}>
                    <EnumSelect
                        propId="provider"
                        label="Provider"
                        options={['s3', 'backblaze', 'azure']}
                    />
                </ConfigProvider>,
            )
            const radios = screen.getAllByRole('radio')
            expect(radios).toHaveLength(3)
            const s3 = radios.find((r) => r.textContent === 's3')!
            expect(s3.getAttribute('aria-checked')).toBe('true')
        })

        it('updates on click', async () => {
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
            const backblaze = screen
                .getAllByRole('radio')
                .find((r) => r.textContent === 'backblaze')!
            await user.click(backblaze)
            expect(backblaze.getAttribute('aria-checked')).toBe('true')
        })
    })

    describe('select layout (explicit or >6 options)', () => {
        it('renders a <select> when layout="select" is forced', () => {
            render(
                <ConfigProvider initialConfig={{ provider: 's3' } as any}>
                    <EnumSelect
                        propId="provider"
                        label="Provider"
                        layout="select"
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
                        layout="select"
                        options={['s3', 'backblaze', 'azure']}
                    />
                </ConfigProvider>,
            )
            const select = screen.getByRole('combobox') as HTMLSelectElement
            await user.selectOptions(select, 'backblaze')
            expect(select.value).toBe('backblaze')
        })

        it('auto-falls back to <select> when options list is long', () => {
            render(
                <ConfigProvider initialConfig={{ lang: 'en-US' } as any}>
                    <EnumSelect
                        propId="lang"
                        label="Language"
                        options={['en-US', 'ar-SA', 'de-DE', 'es-ES', 'fr-FR', 'ja-JP', 'ko-KR', 'zh-CN', 'zh-TW']}
                    />
                </ConfigProvider>,
            )
            expect(screen.getByRole('combobox')).toBeTruthy()
        })
    })
})
