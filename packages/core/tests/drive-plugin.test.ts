import { describe, it, expect, vi } from 'vitest'
import type { DrivePlugin } from '../src/drives/plugin'
import { EventEmitter } from '../src/events'

describe('DrivePlugin interface', () => {
    it('can be implemented and called', () => {
        const emitter = new EventEmitter()
        const mockPlugin: DrivePlugin = {
            id: 'test-adapter',
            name: 'test-adapter',
            init: vi.fn(),
            destroy: vi.fn(),
            restoreSession: vi.fn(() => false),
            isAuthenticated: vi.fn(() => false),
            getAccessToken: vi.fn(() => null),
            getUserInfo: vi.fn(() => Promise.resolve(null)),
            loadFiles: vi.fn(() => Promise.resolve(undefined)),
            downloadFiles: vi.fn(() => Promise.resolve([] as File[])),
            signOut: vi.fn(),
        }
        mockPlugin.init(emitter)
        expect(mockPlugin.init).toHaveBeenCalledWith(emitter)
    })
})
