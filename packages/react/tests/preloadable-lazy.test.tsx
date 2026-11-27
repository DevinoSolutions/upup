import { afterEach, describe, expect, it } from 'vitest'
import { act, cleanup, render } from '@testing-library/react'
import React, { Suspense, type ComponentType } from 'react'
import { preloadableLazy } from '../src/lib/preloadable-lazy'

afterEach(() => {
    cleanup()
})

function deferred<T>() {
    let resolve!: (value: T) => void
    let reject!: (reason: unknown) => void
    const promise = new Promise<T>((res, rej) => {
        resolve = res
        reject = rej
    })
    return { promise, resolve, reject }
}

const View: ComponentType = () => <p data-testid="view">loaded view</p>

function mount(Component: ComponentType) {
    return render(
        <Suspense fallback={<p data-testid="fallback">loading</p>}>
            <Component />
        </Suspense>,
    )
}

describe('preloadableLazy', () => {
    it('shows the Suspense fallback until the chunk resolves, then mounts the view (no preload)', async () => {
        const chunk = deferred<{ default: ComponentType }>()
        const Lazy = preloadableLazy(() => chunk.promise)

        const { queryByTestId } = mount(Lazy)

        expect(queryByTestId('fallback')).not.toBeNull()
        expect(queryByTestId('view')).toBeNull()
        await act(async () => {
            chunk.resolve({ default: View })
        })
        expect(queryByTestId('view')).not.toBeNull()
        expect(Lazy.isLoaded()).toBe(true)
    })

    it('renders the view in the first synchronous render once preload() has resolved', async () => {
        const Lazy = preloadableLazy(() => Promise.resolve({ default: View }))
        await Lazy.preload()

        const { queryByTestId } = mount(Lazy)

        expect(queryByTestId('fallback')).toBeNull()
        expect(queryByTestId('view')).not.toBeNull()
    })

    it('fetches the chunk once when preload() is called repeatedly and then rendered', async () => {
        let loads = 0
        const Lazy = preloadableLazy(() => {
            loads += 1
            return Promise.resolve({ default: View })
        })

        await Promise.all([Lazy.preload(), Lazy.preload()])
        mount(Lazy)

        expect(loads).toBe(1)
    })

    it('swallows a failed preload and retries the load on the next attempt', async () => {
        let attempt = 0
        const Lazy = preloadableLazy(() => {
            attempt += 1
            return attempt === 1
                ? Promise.reject<{ default: ComponentType }>(
                      new Error('network down'),
                  )
                : Promise.resolve({ default: View })
        })

        await expect(Lazy.preload()).resolves.toBeUndefined()
        expect(Lazy.isLoaded()).toBe(false)
        await Lazy.preload()

        expect(Lazy.isLoaded()).toBe(true)
        expect(attempt).toBe(2)
    })
})
