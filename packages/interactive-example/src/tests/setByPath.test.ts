import { describe, it, expect } from 'vitest'
import { setByPath } from '../categories'

// setByPath backs buildDefaultConfig: it walks a dotted entry id such as
// "cloudDrives.googleDrive.clientId" and writes the leaf, creating intermediate
// objects. A crafted __proto__/constructor/prototype segment must never reach
// Object.prototype (CodeQL js/prototype-pollution-utility).
describe('setByPath prototype-pollution guard', () => {
    it('writes a legitimate dotted path by creating each intermediate object', () => {
        const target: Record<string, unknown> = {}
        setByPath(target, 'cloudDrives.googleDrive.clientId', 'abc123')
        expect(target).toEqual({
            cloudDrives: { googleDrive: { clientId: 'abc123' } },
        })
    })

    it('refuses a __proto__ segment so a crafted entry id cannot pollute Object.prototype', () => {
        const target: Record<string, unknown> = {}
        setByPath(target, '__proto__.polluted', 'yes')
        expect(({} as Record<string, unknown>).polluted).toBeUndefined()
        expect(Object.prototype).not.toHaveProperty('polluted')
        expect(target).toEqual({})
    })

    it('refuses a constructor.prototype chain so the classic prototype-pollution gadget writes nothing', () => {
        const target: Record<string, unknown> = {}
        setByPath(target, 'constructor.prototype.polluted', 'yes')
        expect(({} as Record<string, unknown>).polluted).toBeUndefined()
        expect(Object.prototype).not.toHaveProperty('polluted')
        expect(target).toEqual({})
    })
})
