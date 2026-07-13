import { describe, it, expect } from 'vitest'
import { cn } from '@useupup/core/internal'

describe('cn() — tailwind class merge utility', () => {
    it('merges simple class names', () => {
        expect(cn('foo', 'bar')).toBe('foo bar')
    })

    it('handles conditional classes', () => {
        expect(cn('base', false && 'hidden', 'extra')).toBe('base extra')
    })

    it('handles undefined/null values', () => {
        expect(cn('base', undefined, null, 'end')).toBe('base end')
    })

    it('merges conflicting tailwind classes (last wins)', () => {
        expect(cn('p-2', 'p-4')).toBe('p-4')
    })

    it('merges conflicting color classes', () => {
        expect(cn('text-red-500', 'text-blue-500')).toBe('text-blue-500')
    })

    it('preserves non-conflicting classes', () => {
        const result = cn('p-2', 'mt-4', 'text-sm')
        expect(result).toContain('p-2')
        expect(result).toContain('mt-4')
        expect(result).toContain('text-sm')
    })

    it('handles array inputs', () => {
        expect(cn(['foo', 'bar'])).toBe('foo bar')
    })

    it('returns empty string for no inputs', () => {
        expect(cn()).toBe('')
    })
})
