// src/vite.test.ts
import { describe, it, expect } from 'vitest'
import { withUpupViteWorkerFormat } from './vite'

// The helper mutates and returns the SAME object, so these assert on the input
// they passed in. Annotating the literals (rather than widening the helper's
// return type) keeps its signature `T -> T`, which is what makes it assignable
// back to every framework's `StorybookConfig['viteFinal']` return type.
type TestConfig = {
    plugins?: unknown[]
    worker?: { format?: 'es' | 'iife'; plugins?: unknown }
}

describe('withUpupViteWorkerFormat', () => {
    it('sets worker.format to es so the code-splitting module worker can build', () => {
        const config: TestConfig = {}
        withUpupViteWorkerFormat(config)
        expect(config.worker?.format).toBe('es')
    })

    it('overrides an inherited iife worker format rather than deferring to it', () => {
        const config: TestConfig = { worker: { format: 'iife' } }
        withUpupViteWorkerFormat(config)
        expect(config.worker?.format).toBe('es')
    })

    it('preserves the rest of the worker options and the surrounding config', () => {
        const plugin = { name: 'existing' }
        const workerPlugins = () => [plugin]
        const config: TestConfig = {
            plugins: [plugin],
            worker: { plugins: workerPlugins },
        }
        withUpupViteWorkerFormat(config)
        expect(config.plugins).toEqual([plugin])
        expect(config.worker?.plugins).toBe(workerPlugins)
        expect(config.worker?.format).toBe('es')
    })

    it('returns the same object it was handed so a viteFinal hook can return it directly', () => {
        const config: TestConfig = {}
        expect(withUpupViteWorkerFormat(config)).toBe(config)
    })
})
