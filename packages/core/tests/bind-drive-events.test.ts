import { describe, it, expect, vi } from 'vitest'
import { bindDriveEvents } from '../src/drives/bind-drive-events'
import type { UpupCore } from '../src/core'

type MockEventHandler = (payload?: unknown) => void

function createMockCore() {
    const listeners = new Map<string, MockEventHandler>()
    return {
        on: vi.fn((event: string, cb: MockEventHandler) => {
            listeners.set(event, cb)
            return () => listeners.delete(event)
        }),
        _emit(event: string, payload?: unknown) {
            listeners.get(event)?.(payload)
        },
    }
}

describe('bindDriveEvents', () => {
    it('subscribes to all 6 standard adapter events', () => {
        const core = createMockCore()
        const callbacks = {
            onAuthenticated: vi.fn(),
            onSignedOut: vi.fn(),
            onSessionExpired: vi.fn(),
            onFilesLoaded: vi.fn(),
            onStateChange: vi.fn(),
            onError: vi.fn(),
        }
        bindDriveEvents(core as unknown as UpupCore, 'box', callbacks)
        expect(core.on).toHaveBeenCalledTimes(6)
        expect(core.on).toHaveBeenCalledWith(
            'box:authenticated',
            expect.any(Function),
        )
        expect(core.on).toHaveBeenCalledWith('box:error', expect.any(Function))
    })

    it('forwards event payloads to callbacks', () => {
        const core = createMockCore()
        const callbacks = {
            onAuthenticated: vi.fn(),
            onSignedOut: vi.fn(),
            onSessionExpired: vi.fn(),
            onFilesLoaded: vi.fn(),
            onStateChange: vi.fn(),
            onError: vi.fn(),
        }
        bindDriveEvents(core as unknown as UpupCore, 'box', callbacks)
        core._emit('box:authenticated', { user: { name: 'Test' } })
        expect(callbacks.onAuthenticated).toHaveBeenCalledWith({
            user: { name: 'Test' },
        })
    })

    it('returns cleanup function that unsubscribes all', () => {
        const core = createMockCore()
        const callbacks = {
            onAuthenticated: vi.fn(),
            onSignedOut: vi.fn(),
            onSessionExpired: vi.fn(),
            onFilesLoaded: vi.fn(),
            onStateChange: vi.fn(),
            onError: vi.fn(),
        }
        const cleanup = bindDriveEvents(
            core as unknown as UpupCore,
            'box',
            callbacks,
        )
        cleanup()
        core._emit('box:authenticated', { user: { name: 'Test' } })
        expect(callbacks.onAuthenticated).not.toHaveBeenCalled()
    })

    it('works with any provider prefix', () => {
        const core = createMockCore()
        const callbacks = {
            onAuthenticated: vi.fn(),
            onSignedOut: vi.fn(),
            onSessionExpired: vi.fn(),
            onFilesLoaded: vi.fn(),
            onStateChange: vi.fn(),
            onError: vi.fn(),
        }
        bindDriveEvents(core as unknown as UpupCore, 'google-drive', callbacks)
        expect(core.on).toHaveBeenCalledWith(
            'google-drive:authenticated',
            expect.any(Function),
        )
    })
})
