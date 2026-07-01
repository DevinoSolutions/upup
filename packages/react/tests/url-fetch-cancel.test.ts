import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { renderHook, act } from '@testing-library/react'

// Test doubles captured by the UploaderContext mock below.
const emit = vi.fn()
const onError = vi.fn()

vi.mock('../src/context/UploaderContext', () => ({
    useUploaderRuntime: () => ({ core: { emit } }),
    useUploaderOptions: () => ({ onError }),
}))

import useFetchFileByUrl from '../src/hooks/useFetchFileByUrl'

/** A fetch that never settles on its own — it rejects with AbortError only
 *  when its AbortSignal fires. Lets us drive the cancellation path. */
function abortableFetch() {
    return vi.fn(
        (_url: string, opts?: { signal?: AbortSignal }) =>
            new Promise((_resolve, reject) => {
                opts?.signal?.addEventListener('abort', () => {
                    const err = new Error('Aborted')
                    err.name = 'AbortError'
                    reject(err)
                })
            }),
    )
}

describe('useFetchFileByUrl — cancellation', () => {
    const originalFetch = global.fetch

    beforeEach(() => {
        emit.mockClear()
        onError.mockClear()
    })

    afterEach(() => {
        global.fetch = originalFetch
    })

    it('exposes a cancelFetch function', () => {
        const { result } = renderHook(() => useFetchFileByUrl())
        expect(typeof result.current.cancelFetch).toBe('function')
    })

    it('passes an AbortSignal to fetch', async () => {
        const fetchMock = vi.fn().mockResolvedValue(
            new Response('x', {
                status: 200,
                headers: { 'content-type': 'text/plain' },
            }),
        )
        global.fetch = fetchMock as unknown as typeof fetch

        const { result } = renderHook(() => useFetchFileByUrl())
        await act(async () => {
            await result.current.fetchImage('https://cdn.example.com/a.txt')
        })

        expect(fetchMock).toHaveBeenCalledTimes(1)
        expect(fetchMock.mock.calls[0][1]?.signal).toBeInstanceOf(AbortSignal)
    })

    it('cancelFetch aborts an in-flight fetch, emits url-fetch-cancel, and does not call onError', async () => {
        global.fetch = abortableFetch() as unknown as typeof fetch

        const { result } = renderHook(() => useFetchFileByUrl())

        let pending: Promise<unknown> | undefined
        act(() => {
            pending = result.current.fetchImage('https://cdn.example.com/slow.bin')
        })
        act(() => {
            result.current.cancelFetch()
        })
        await act(async () => {
            await pending
        })

        expect(emit).toHaveBeenCalledWith('url-fetch-cancel', {
            url: 'https://cdn.example.com/slow.bin',
        })
        expect(emit).not.toHaveBeenCalledWith('url-fetch', expect.anything())
        expect(onError).not.toHaveBeenCalled()
    })

    it('unmounting cancels an in-flight fetch (no onError, emits url-fetch-cancel)', async () => {
        global.fetch = abortableFetch() as unknown as typeof fetch

        const { result, unmount } = renderHook(() => useFetchFileByUrl())

        let pending: Promise<unknown> | undefined
        act(() => {
            pending = result.current.fetchImage('https://cdn.example.com/onunmount.bin')
        })
        unmount()
        await act(async () => {
            await pending
        })

        expect(emit).toHaveBeenCalledWith('url-fetch-cancel', {
            url: 'https://cdn.example.com/onunmount.bin',
        })
        expect(onError).not.toHaveBeenCalled()
    })
})
