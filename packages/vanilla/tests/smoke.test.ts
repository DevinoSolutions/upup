import { describe, it, expect } from 'vitest'
import { resolveTarget } from '../src/lib/dom'

describe('@useupup/vanilla scaffold', () => {
    it('resolveTarget is a function', () => {
        expect(typeof resolveTarget).toBe('function')
    })
})
