import { describe, it, expect } from 'vitest'
import { cn } from '../src/lib/tailwind'

// ─────────────────────────────────────────────
// cn (clsx + tailwind-merge)
// ─────────────────────────────────────────────
describe('cn', () => {
    it('returns empty string for no arguments', () => {
        expect(cn()).toBe('')
    })

    it('returns a single class name unchanged', () => {
        expect(cn('foo')).toBe('foo')
    })

    it('joins multiple class names with a space', () => {
        expect(cn('foo', 'bar')).toBe('foo bar')
    })

    it('ignores falsy values (undefined, null, false)', () => {
        expect(cn('foo', undefined, null, false, 'bar')).toBe('foo bar')
    })

    it('includes truthy conditional classes', () => {
        expect(cn('base', true && 'active')).toBe('base active')
    })

    it('excludes false conditional classes', () => {
        expect(cn('base', false && 'hidden')).toBe('base')
    })

    it('accepts object syntax — includes keys with truthy values', () => {
        expect(cn({ foo: true, bar: false, baz: true })).toBe('foo baz')
    })

    it('accepts object syntax — excludes keys with falsy values', () => {
        expect(cn({ disabled: false })).toBe('')
    })

    it('accepts array syntax', () => {
        expect(cn(['a', 'b'])).toBe('a b')
    })

    it('merges conflicting Tailwind classes (last wins)', () => {
        // tailwind-merge should keep only the last padding class
        expect(cn('p-2', 'p-4')).toBe('p-4')
    })

    it('merges conflicting text-size classes', () => {
        expect(cn('text-sm', 'text-lg')).toBe('text-lg')
    })

    it('merges conflicting background-color classes', () => {
        expect(cn('bg-red-500', 'bg-blue-500')).toBe('bg-blue-500')
    })

    it('keeps non-conflicting Tailwind classes', () => {
        const result = cn('p-4', 'text-sm', 'font-bold')
        expect(result).toContain('p-4')
        expect(result).toContain('text-sm')
        expect(result).toContain('font-bold')
    })

    it('handles mixed strings, objects, and conditionals', () => {
        const isActive = true
        const isDisabled = false
        const result = cn('base', { active: isActive, disabled: isDisabled }, 'extra')
        expect(result).toContain('base')
        expect(result).toContain('active')
        expect(result).toContain('extra')
        expect(result).not.toContain('disabled')
    })

    it('deduplicates identical class names via tailwind-merge', () => {
        // tw-merge collapses duplicate utility classes
        const result = cn('flex', 'flex')
        expect(result).toBe('flex')
    })

    it('handles empty string inputs gracefully', () => {
        expect(cn('', 'foo', '')).toBe('foo')
    })

    it('handles a deeply nested array', () => {
        expect(cn(['a', ['b', 'c']])).toBe('a b c')
    })

    it('returns the correct type (string)', () => {
        expect(typeof cn('foo', 'bar')).toBe('string')
    })
})
