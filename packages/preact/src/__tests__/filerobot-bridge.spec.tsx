import { render, screen, cleanup, waitFor } from '@testing-library/preact'
import { afterEach, expect, test, vi } from 'vitest'

// Mock the island loader so no real React/Konva loads in the unit test.
// vi.hoisted lets the mock factory reference `mount` (vi.mock is hoisted above consts).
const { mount } = vi.hoisted(() => ({
    mount: vi.fn(() => ({ update: vi.fn(), unmount: vi.fn() })),
}))
vi.mock('../filerobot-island-loader', () => ({
    loadIsland: vi.fn(() => Promise.resolve({ mount })),
}))

import FilerobotBridge, { TABS, TOOLS } from '../filerobot-bridge'
import { loadIsland } from '../filerobot-island-loader'

afterEach(() => {
    cleanup()
    vi.clearAllMocks()
})

const baseProps = { source: 'data:image/png;base64,AAAA' }

test('bridge renders a host container and mounts the island', async () => {
    const { container } = render(<FilerobotBridge {...baseProps} />)
    // Host div renders synchronously so the island has a node to mount into.
    expect(container.querySelector('div')).toBeTruthy()
    await waitFor(() => expect(mount).toHaveBeenCalledTimes(1))
})

test('bridge re-exports TABS and TOOLS (read synchronously by the chrome)', () => {
    expect(TABS.ADJUST).toBe('Adjust')
    expect(TOOLS.CROP).toBe('Crop')
})

test('bridge shows an error state when the island fails to load', async () => {
    vi.mocked(loadIsland).mockRejectedValueOnce(new Error('boom'))
    render(<FilerobotBridge {...baseProps} />)
    await waitFor(() =>
        expect(screen.getByText(/failed to load/i)).toBeTruthy(),
    )
})
