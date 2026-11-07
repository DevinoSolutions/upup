import { vi } from 'vitest'
import type { EventEmitter } from '../../src/events'
import type { DriveFile } from '../../src/drives/types'

export function captureEvents(emitter: EventEmitter) {
    const events: Array<{ event: string; payload: unknown }> = []
    const originalEmit = emitter.emit.bind(emitter)
    emitter.emit = (event: string, payload?: unknown) => {
        events.push({ event, payload })
        return originalEmit(event, payload)
    }
    return events
}

export function mockFetchResponse(
    body: unknown,
    status = 200,
    ok = true,
): ReturnType<typeof vi.fn> {
    return vi.fn().mockResolvedValue({
        ok,
        status,
        json: vi.fn().mockResolvedValue(body),
        text: vi
            .fn()
            .mockResolvedValue(
                typeof body === 'string' ? body : JSON.stringify(body),
            ),
        blob: vi
            .fn()
            .mockResolvedValue(
                new Blob(['file-content'], { type: 'text/plain' }),
            ),
    })
}

/**
 * Every request this run made to `endpoint`, as parsed query params. A root
 * listing with `sharedDrives` on hits TWO endpoints, so a test must say which
 * one it means rather than reading whichever call happened last.
 */
export function requestsTo(
    fetchMock: ReturnType<typeof vi.fn>,
    endpoint: string,
): URLSearchParams[] {
    return fetchMock.mock.calls
        .map(call => call[0] as string)
        .filter(url => url.startsWith(endpoint))
        .map(url => new URL(url).searchParams)
}

export function firstRequestTo(
    fetchMock: ReturnType<typeof vi.fn>,
    endpoint: string,
): URLSearchParams {
    const found = requestsTo(fetchMock, endpoint)[0]
    if (!found) throw new Error(`no request was made to ${endpoint}`)
    return found
}

function stubbedResponse(body: unknown) {
    return {
        ok: true,
        status: 200,
        json: vi.fn().mockResolvedValue(body),
        text: vi.fn().mockResolvedValue(JSON.stringify(body)),
        blob: vi.fn().mockResolvedValue(new Blob(['file-content'])),
    }
}

/** A fetch mock answering each call with the next body in the list. */
export function mockFetchSequence(bodies: unknown[]): ReturnType<typeof vi.fn> {
    const mock = vi.fn()
    for (const body of bodies) {
        mock.mockResolvedValueOnce(stubbedResponse(body))
    }
    mock.mockResolvedValue(stubbedResponse({}))
    return mock
}

export function makeDriveFile(overrides: Partial<DriveFile> = {}): DriveFile {
    return {
        id: 'file-abc123',
        name: 'test.txt',
        path: '',
        size: 100,
        mimeType: 'text/plain',
        isFolder: false,
        ...overrides,
    }
}

// ── Mock browser globals ──

export const sessionStore = new Map<string, string>()

export const mockSessionStorage = {
    getItem: vi.fn((key: string) => sessionStore.get(key) ?? null),
    setItem: vi.fn((key: string, value: string) => {
        sessionStore.set(key, value)
    }),
    removeItem: vi.fn((key: string) => {
        sessionStore.delete(key)
    }),
    clear: vi.fn(() => sessionStore.clear()),
    get length() {
        return sessionStore.size
    },
    key: vi.fn((_i: number) => null),
}
