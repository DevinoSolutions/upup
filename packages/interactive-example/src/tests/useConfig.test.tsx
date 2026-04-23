import { describe, it, expect, vi } from 'vitest'
import { render, screen, act } from '@testing-library/react'
import React from 'react'
import { ConfigProvider } from '../state/ConfigContext'
import { useConfig } from '../state/useConfig'

function Probe({ path }: { path: string }) {
    const { value, set } = useConfig(path)
    return (
        <div>
            <span data-testid="value">{JSON.stringify(value)}</span>
            <button onClick={() => set('backblaze')}>set</button>
        </div>
    )
}

describe('useConfig', () => {
    it('returns initial value when set via initialConfig', () => {
        render(
            <ConfigProvider initialConfig={{ provider: 's3' } as any}>
                <Probe path="provider" />
            </ConfigProvider>,
        )
        expect(screen.getByTestId('value').textContent).toBe('"s3"')
    })

    it('returns undefined when path has no declared default and no user value', () => {
        // ConfigProvider seeds from buildDefaultConfig() so fields with a
        // declared defaultValue come back as that default. maxFileSize is
        // declared as undefined (no default) so the path genuinely resolves
        // to undefined — the original "no initial value" contract for entries
        // that opt out of seeding.
        render(
            <ConfigProvider initialConfig={{}}>
                <Probe path="maxFileSize" />
            </ConfigProvider>,
        )
        expect(screen.getByTestId('value').textContent).toBe('')
    })

    it('falls back to declared default when path has no user value', () => {
        // `provider` declares default 'aws' — reading it from an otherwise
        // empty config still returns 'aws' because the seed injects it.
        render(
            <ConfigProvider initialConfig={{}}>
                <Probe path="provider" />
            </ConfigProvider>,
        )
        expect(screen.getByTestId('value').textContent).toBe('"aws"')
    })

    it('updates value when set() is called', () => {
        render(
            <ConfigProvider initialConfig={{ provider: 's3' } as any}>
                <Probe path="provider" />
            </ConfigProvider>,
        )
        act(() => {
            screen.getByText('set').click()
        })
        expect(screen.getByTestId('value').textContent).toBe('"backblaze"')
    })

    it('supports dotted paths for nested config', () => {
        render(
            <ConfigProvider
                initialConfig={{
                    cloudDrives: { googleDrive: { clientId: 'abc' } } as any,
                }}
            >
                <Probe path="cloudDrives.googleDrive.clientId" />
            </ConfigProvider>,
        )
        expect(screen.getByTestId('value').textContent).toBe('"abc"')
    })

    it('throws when used outside a ConfigProvider', () => {
        const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
        expect(() => render(<Probe path="provider" />)).toThrow(
            /useConfig must be used inside <ConfigProvider>/,
        )
        errorSpy.mockRestore()
    })
})
