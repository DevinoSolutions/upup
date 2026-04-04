import { describe, it, expect } from 'vitest'
import { composeEnhancers } from '../src/compose-enhancers'
import type { CoreOptions } from '../src/core'

type Enhancer = (options: CoreOptions) => CoreOptions

describe('composeEnhancers', () => {
  it('should return identity when called with no enhancers', () => {
    const composed = composeEnhancers()
    const options: CoreOptions = { maxRetries: 3 }
    expect(composed(options)).toEqual(options)
  })

  it('should apply a single enhancer', () => {
    const addRetries: Enhancer = (opts) => ({ ...opts, maxRetries: 5 })
    const composed = composeEnhancers(addRetries)
    const result = composed({})
    expect(result.maxRetries).toBe(5)
  })

  it('should compose multiple enhancers left-to-right', () => {
    const calls: string[] = []

    const first: Enhancer = (opts) => {
      calls.push('first')
      return { ...opts, maxRetries: 1 }
    }
    const second: Enhancer = (opts) => {
      calls.push('second')
      return { ...opts, maxRetries: (opts.maxRetries ?? 0) + 1 }
    }

    const composed = composeEnhancers(first, second)
    const result = composed({})

    expect(calls).toEqual(['first', 'second'])
    expect(result.maxRetries).toBe(2)
  })

  it('should pass the result of each enhancer to the next', () => {
    const setRetries: Enhancer = (opts) => ({ ...opts, maxRetries: 10 })
    const doubleRetries: Enhancer = (opts) => ({
      ...opts,
      maxRetries: (opts.maxRetries ?? 0) * 2,
    })

    const composed = composeEnhancers(setRetries, doubleRetries)
    const result = composed({})
    expect(result.maxRetries).toBe(20)
  })
})
