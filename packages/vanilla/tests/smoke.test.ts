import { describe, it, expect } from 'vitest'
import { resolveTarget } from '../src/lib/dom'

describe('@upupjs/vanilla scaffold', () => {
    it('resolveTarget is a function', () => {
        expect(typeof resolveTarget).toBe('function')
    })
})
