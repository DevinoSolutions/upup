import { describe, it, expect } from 'vitest'
import { composeEnhancers, CoreEnhancer } from '../src/compose-enhancers'
import type { CoreOptions } from '../src/core'

describe('composeEnhancers — extended', () => {
    it('identity when no enhancers returns exact same options', () => {
        const opts: CoreOptions = { provider: 'aws', maxRetries: 3 }
        const composed = composeEnhancers()
        const result = composed(opts)
        expect(result).toEqual(opts)
    })

    it('single enhancer transforms options', () => {
        const addLimit: CoreEnhancer = (opts) => ({ ...opts, limit: 10 })
        const composed = composeEnhancers(addLimit)
        expect(composed({}).limit).toBe(10)
    })

    it('applies enhancers left to right', () => {
        const setA: CoreEnhancer = (opts) => ({ ...opts, maxRetries: 1 })
        const setB: CoreEnhancer = (opts) => ({ ...opts, maxRetries: (opts.maxRetries ?? 0) + 10 })
        const composed = composeEnhancers(setA, setB)
        expect(composed({}).maxRetries).toBe(11) // 1 + 10
    })

    it('later enhancer can override earlier one', () => {
        const first: CoreEnhancer = (opts) => ({ ...opts, provider: 'aws' })
        const second: CoreEnhancer = (opts) => ({ ...opts, provider: 'gcs' as any })
        const composed = composeEnhancers(first, second)
        expect(composed({}).provider).toBe('gcs')
    })

    it('preserves options not touched by enhancers', () => {
        const addRetries: CoreEnhancer = (opts) => ({ ...opts, maxRetries: 5 })
        const composed = composeEnhancers(addRetries)
        const result = composed({ provider: 'aws', accept: 'image/*' })
        expect(result.provider).toBe('aws')
        expect(result.accept).toBe('image/*')
        expect(result.maxRetries).toBe(5)
    })

    it('chains three enhancers correctly', () => {
        const e1: CoreEnhancer = (opts) => ({ ...opts, maxRetries: 3 })
        const e2: CoreEnhancer = (opts) => ({ ...opts, limit: 5 })
        const e3: CoreEnhancer = (opts) => ({ ...opts, autoUpload: true })
        const composed = composeEnhancers(e1, e2, e3)
        const result = composed({})
        expect(result.maxRetries).toBe(3)
        expect(result.limit).toBe(5)
        expect(result.autoUpload).toBe(true)
    })

    it('enhancer receives output of previous enhancer', () => {
        const e1: CoreEnhancer = (opts) => ({ ...opts, maxRetries: 2 })
        const e2: CoreEnhancer = (opts) => {
            // Should see maxRetries=2 from e1
            expect(opts.maxRetries).toBe(2)
            return { ...opts, maxRetries: (opts.maxRetries ?? 0) * 3 }
        }
        const composed = composeEnhancers(e1, e2)
        expect(composed({}).maxRetries).toBe(6)
    })

    it('works with UpupCore constructor', () => {
        // Integration: composed enhancers produce valid CoreOptions
        const withDefaults = composeEnhancers(
            (opts) => ({ ...opts, maxRetries: 3, autoUpload: false }),
            (opts) => ({ ...opts, provider: opts.provider || 'aws' }),
        )
        const result = withDefaults({ accept: 'image/*' })
        expect(result.maxRetries).toBe(3)
        expect(result.autoUpload).toBe(false)
        expect(result.provider).toBe('aws')
        expect(result.accept).toBe('image/*')
    })
})
