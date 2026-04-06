import { describe, it, expect, vi } from 'vitest'
import { UpupCore } from '../src/core'
import type { UpupPlugin } from '../src/plugin'

// ─────────────────────────────────────────────
// UpupCore.use() chaining
// ─────────────────────────────────────────────
describe('UpupCore.use() — chaining and integration', () => {
    it('returns core for method chaining', () => {
        const core = new UpupCore({})
        const plugin: UpupPlugin = { name: 'chain-test', setup: () => {} }
        const result = core.use(plugin)
        expect(result).toBe(core)
        core.destroy()
    })

    it('chains multiple plugins in sequence', () => {
        const order: string[] = []
        const core = new UpupCore({})
        core
            .use({ name: 'first', setup: () => order.push('first') })
            .use({ name: 'second', setup: () => order.push('second') })
            .use({ name: 'third', setup: () => order.push('third') })
        expect(order).toEqual(['first', 'second', 'third'])
        core.destroy()
    })

    it('plugin setup receives the core instance', () => {
        const core = new UpupCore({})
        let receivedCore: unknown
        core.use({ name: 'receiver', setup: (c) => { receivedCore = c } })
        expect(receivedCore).toBe(core)
        core.destroy()
    })

    it('plugin can subscribe to core events during setup', async () => {
        const core = new UpupCore({})
        const handler = vi.fn()
        core.use({
            name: 'event-listener',
            setup: (c) => { c.on('files-added', handler) },
        })
        await core.addFiles([new File(['x'], 'a.txt', { type: 'text/plain' })])
        expect(handler).toHaveBeenCalled()
        core.destroy()
    })

    it('rejects duplicate plugin names', () => {
        const core = new UpupCore({})
        core.use({ name: 'unique', setup: () => {} })
        expect(() => core.use({ name: 'unique', setup: () => {} })).toThrow()
        core.destroy()
    })
})

// ─────────────────────────────────────────────
// UpupCore.ext() — type-safe extensions
// ─────────────────────────────────────────────
describe('UpupCore.getExtension() — extension access', () => {
    it('returns undefined for unregistered extension', () => {
        const core = new UpupCore({})
        expect(core.getExtension('nonexistent')).toBeUndefined()
        core.destroy()
    })

    it('returns registered extension methods', () => {
        const core = new UpupCore({})
        core.use({
            name: 'math-ext',
            setup: (c) => {
                (c as any).pluginManager.registerExtension('math', {
                    add: (a: number, b: number) => a + b,
                })
            },
        })
        const math = core.getExtension('math') as any
        expect(math).toBeDefined()
        expect(math.add(2, 3)).toBe(5)
        core.destroy()
    })

    it('extensions survive file operations', async () => {
        const core = new UpupCore({})
        core.use({
            name: 'counter-ext',
            setup: (c) => {
                let count = 0
                c.on('files-added', () => count++)
                ;(c as any).pluginManager.registerExtension('counter', {
                    getCount: () => count,
                })
            },
        })

        await core.addFiles([new File(['a'], 'a.txt', { type: 'text/plain' })])
        await core.addFiles([new File(['b'], 'b.txt', { type: 'text/plain' })])

        const counter = core.getExtension('counter') as any
        expect(counter.getCount()).toBe(2)
        core.destroy()
    })

    it('extensions are cleared after destroy', () => {
        const core = new UpupCore({})
        core.use({
            name: 'temp-ext',
            setup: (c) => {
                (c as any).pluginManager.registerExtension('temp', { val: 42 })
            },
        })
        expect(core.getExtension('temp')).toBeDefined()
        core.destroy()
        expect(core.getExtension('temp')).toBeUndefined()
    })
})

// ─────────────────────────────────────────────
// options.plugins
// ─────────────────────────────────────────────
describe('UpupCore — options.plugins', () => {
    it('registers plugins passed in constructor options', () => {
        const setup = vi.fn()
        const core = new UpupCore({
            plugins: [{ name: 'opt-plug', setup }],
        })
        expect(setup).toHaveBeenCalledOnce()
        core.destroy()
    })

    it('constructor plugins and use() plugins coexist', () => {
        const setups: string[] = []
        const core = new UpupCore({
            plugins: [{ name: 'from-opts', setup: () => setups.push('opts') }],
        })
        core.use({ name: 'from-use', setup: () => setups.push('use') })
        expect(setups).toEqual(['opts', 'use'])
        core.destroy()
    })
})
