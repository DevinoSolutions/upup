import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

// Fresh module state per test: the throttle and budgets are process-level Maps.
async function load() {
    vi.resetModules()
    return import('@/lib/support/confirmation-throttle')
}

beforeEach(() => {
    vi.useFakeTimers({ toFake: ['Date'] })
    vi.setSystemTime(new Date('2026-10-23T12:00:00Z'))
})
afterEach(() => {
    vi.useRealTimers()
})

const HOUR = 60 * 60 * 1000

describe('per-recipient allowance', () => {
    it('allows one confirmation per address and blocks the repeat', async () => {
        const t = await load()
        expect(t.takeConfirmationSlot('a@example.com')).toBe(true)
        expect(t.takeConfirmationSlot('a@example.com')).toBe(false)
    })

    it('folds case and +tag variants into one allowance', async () => {
        const t = await load()
        expect(t.takeConfirmationSlot('Dev+one@Example.com')).toBe(true)
        expect(t.takeConfirmationSlot('dev+two@example.com')).toBe(false)
        expect(t.takeConfirmationSlot('dev@example.com')).toBe(false)
    })

    it('treats gmail dots as insignificant and googlemail.com as gmail.com', async () => {
        const t = await load()
        expect(t.takeConfirmationSlot('john.doe@gmail.com')).toBe(true)
        expect(t.takeConfirmationSlot('johndoe@gmail.com')).toBe(false)
        expect(t.takeConfirmationSlot('j.o.h.n.d.o.e+x@googlemail.com')).toBe(
            false,
        )
        expect(t.takeConfirmationSlot('JohnDoe@GoogleMail.com')).toBe(false)
    })

    it('keeps dots significant on every other domain', async () => {
        const t = await load()
        expect(t.takeConfirmationSlot('john.doe@example.com')).toBe(true)
        expect(t.takeConfirmationSlot('johndoe@example.com')).toBe(true)
    })

    it('does not merge the same local part across different domains', async () => {
        const t = await load()
        expect(t.takeConfirmationSlot('a@example.com')).toBe(true)
        expect(t.takeConfirmationSlot('a@example.org')).toBe(true)
        expect(t.takeConfirmationSlot('a@gmail.com')).toBe(true)
    })

    it('frees the address after 24 hours, not before', async () => {
        const t = await load()
        t.takeConfirmationSlot('a@example.com')
        vi.setSystemTime(Date.now() + 24 * HOUR - 1000)
        expect(t.takeConfirmationSlot('a@example.com')).toBe(false)
        vi.setSystemTime(Date.now() + 2000)
        expect(t.takeConfirmationSlot('a@example.com')).toBe(true)
    })

    it('hands the allowance back on release', async () => {
        const t = await load()
        t.takeConfirmationSlot('a.b@gmail.com')
        t.releaseConfirmationSlot('ab+tag@googlemail.com')
        expect(t.takeConfirmationSlot('a.b@gmail.com')).toBe(true)
    })

    it('evicts the oldest address at the tracking cap, so memory stays bounded', async () => {
        const t = await load()
        const cap = t.CONFIRMATION_MAX_TRACKED_ADDRESSES
        for (let i = 0; i < cap; i++) {
            expect(t.takeConfirmationSlot(`u${i}@example.com`)).toBe(true)
        }
        // Full, nothing forgotten yet.
        expect(t.takeConfirmationSlot('u0@example.com')).toBe(false)

        expect(t.takeConfirmationSlot('overflow@example.com')).toBe(true)
        // The oldest entry was dropped to make room (this is why the IP and
        // daily budgets, not this map, are the primary relay guard)...
        expect(t.takeConfirmationSlot('u0@example.com')).toBe(true)
        // ...while a recent one is still blocked.
        expect(t.takeConfirmationSlot('overflow@example.com')).toBe(false)
    })
})

describe('per-IP hourly budget', () => {
    it('allows 2 confirmations per IP per hour', async () => {
        const t = await load()
        expect(t.takeConfirmationBudget('203.0.113.1')).toBe(true)
        expect(t.takeConfirmationBudget('203.0.113.1')).toBe(true)
        expect(t.takeConfirmationBudget('203.0.113.1')).toBe(false)
    })

    it('keeps each IP independent', async () => {
        const t = await load()
        t.takeConfirmationBudget('203.0.113.1')
        t.takeConfirmationBudget('203.0.113.1')
        expect(t.takeConfirmationBudget('203.0.113.2')).toBe(true)
    })

    it('frees the IP an hour after each confirmation, not before', async () => {
        const t = await load()
        t.takeConfirmationBudget('203.0.113.1')
        vi.setSystemTime(Date.now() + HOUR / 2)
        t.takeConfirmationBudget('203.0.113.1')
        expect(t.takeConfirmationBudget('203.0.113.1')).toBe(false)
        vi.setSystemTime(Date.now() + HOUR / 2 + 1000)
        // The first has aged out, the second has not.
        expect(t.takeConfirmationBudget('203.0.113.1')).toBe(true)
        expect(t.takeConfirmationBudget('203.0.113.1')).toBe(false)
    })

    it('hands the budget back on release', async () => {
        const t = await load()
        t.takeConfirmationBudget('203.0.113.1')
        t.takeConfirmationBudget('203.0.113.1')
        t.releaseConfirmationBudget('203.0.113.1')
        expect(t.takeConfirmationBudget('203.0.113.1')).toBe(true)
    })
})

describe('global daily cap', () => {
    it('stops at 200 confirmations per UTC day across all IPs, and a release reopens one', async () => {
        const t = await load()
        expect(t.CONFIRMATIONS_PER_DAY).toBe(200)
        for (let i = 0; i < 200; i++) {
            expect(t.takeConfirmationBudget(`10.0.${i >> 8}.${i & 255}`)).toBe(
                true,
            )
        }
        expect(t.takeConfirmationBudget('192.0.2.1')).toBe(false)

        t.releaseConfirmationBudget('10.0.0.0')
        expect(t.takeConfirmationBudget('192.0.2.1')).toBe(true)
        expect(t.takeConfirmationBudget('192.0.2.2')).toBe(false)
    })

    it('resets at the UTC day boundary', async () => {
        const t = await load()
        vi.setSystemTime(new Date('2026-10-23T23:59:00Z'))
        for (let i = 0; i < 200; i++) t.takeConfirmationBudget(`10.1.0.${i}`)
        expect(t.takeConfirmationBudget('192.0.2.1')).toBe(false)

        vi.setSystemTime(new Date('2026-10-24T00:00:01Z'))
        expect(t.takeConfirmationBudget('192.0.2.1')).toBe(true)
    })

    it('does not spend the daily cap on a request the IP budget refused', async () => {
        const t = await load()
        t.takeConfirmationBudget('203.0.113.1')
        t.takeConfirmationBudget('203.0.113.1')
        for (let i = 0; i < 500; i++) t.takeConfirmationBudget('203.0.113.1')
        // 2 spent, 500 refused: 198 of the 200 remain for other IPs.
        let granted = 0
        for (let i = 0; i < 300; i++) {
            if (t.takeConfirmationBudget(`10.2.${i >> 8}.${i & 255}`)) granted++
        }
        expect(granted).toBe(198)
    })
})
