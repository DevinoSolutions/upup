import { describe, expect, it } from 'vitest'
import { canonicalUrl, siteUrl } from '@/lib/site-url'

// NEXT_PUBLIC_BASE_URL is unset under vitest, so these pin the production
// fallback plus the trailing-slash policy (trailingSlash:true — canonicals
// must point at the served slashed URL, never the 308 source).
describe('site-url helper', () => {
    it('falls back to the production origin without a trailing slash', () => {
        expect(siteUrl()).toBe('https://useupup.com')
    })

    it('root canonical is the origin plus a single trailing slash', () => {
        expect(canonicalUrl()).toBe('https://useupup.com/')
    })

    it('page canonicals normalize leading/trailing slashes to exactly one trailing slash', () => {
        expect(canonicalUrl('react')).toBe('https://useupup.com/react/')
        expect(canonicalUrl('/react/')).toBe('https://useupup.com/react/')
        expect(canonicalUrl('docs/getting-started')).toBe(
            'https://useupup.com/docs/getting-started/',
        )
    })
})
