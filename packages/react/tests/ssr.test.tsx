/**
 * SSR regression tests. These reproduce the conditions a Next.js App Router
 * page runs under: no DOM, global `navigator` may exist but `navigator.onLine`
 * is undefined, no `matchMedia`. A hydration-safe component must not branch
 * its rendered output on any of these during the first render.
 */
import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import React from 'react'
import { renderToString } from 'react-dom/server'
import { UpupUploader } from '../src'

describe('UpupUploader SSR', () => {
    let originalNavigator: PropertyDescriptor | undefined
    beforeEach(() => {
        originalNavigator = Object.getOwnPropertyDescriptor(globalThis, 'navigator')
        // Simulate Node 21+ / Next.js where `navigator` is defined but `onLine` is not.
        Object.defineProperty(globalThis, 'navigator', {
            value: { userAgent: 'node' },
            configurable: true,
            writable: true,
        })
    })
    afterEach(() => {
        if (originalNavigator) {
            Object.defineProperty(globalThis, 'navigator', originalNavigator)
        } else {
            // @ts-expect-error — cleanup
            delete globalThis.navigator
        }
    })

    it('renders without throwing when navigator.onLine is undefined', () => {
        expect(() =>
            renderToString(
                <UpupUploader provider="s3" serverUrl="https://example.com" />,
            ),
        ).not.toThrow()
    })

    it('does not render the offline banner on SSR (isOnline defaults to true)', () => {
        const html = renderToString(
            <UpupUploader provider="s3" serverUrl="https://example.com" />,
        )
        expect(html).not.toContain('No internet connection')
    })

    it('renders the adapter selector on SSR (online branch)', () => {
        const html = renderToString(
            <UpupUploader provider="s3" serverUrl="https://example.com" />,
        )
        expect(html).toContain('data-upup-slot="adapter-selector"')
    })

    it('renders a deterministic data-theme on SSR when mode is system', () => {
        const html = renderToString(
            <UpupUploader provider="s3" serverUrl="https://example.com" />,
        )
        expect(html).toContain('data-theme="light"')
        expect(html).not.toContain('data-theme="dark"')
    })

    it('renders without matchMedia (simulating Node environment)', () => {
        const originalWindow = (globalThis as any).window
        delete (globalThis as any).window
        try {
            expect(() =>
                renderToString(
                    <UpupUploader provider="s3" serverUrl="https://example.com" />,
                ),
            ).not.toThrow()
        } finally {
            if (originalWindow !== undefined) (globalThis as any).window = originalWindow
        }
    })
})
