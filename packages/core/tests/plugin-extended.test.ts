import { describe, it, expect, vi } from 'vitest'
import { UpupCore } from '../src/core'
import type { UpupPlugin } from '../src/plugin'

// ─────────────────────────────────────────────
// UpupCore.use() chaining
// ─────────────────────────────────────────────
describe('UpupCore.use() — chaining and integration', () => {
    it('returns core for method chaining', () => {
        const core = new UpupCore({})
        const plugin: UpupPlugin = { name: 'chain-test', init: () => {} }
        const result = core.use(plugin)
        expect(result).toBe(core)
        core.destroy()
    })

    it('chains multiple plugins in sequence', () => {
        const order: string[] = []
        const core = new UpupCore({})
        core
            .use({ name: 'first', init: () => order.push('first') })
            .use({ name: 'second', init: () => order.push('second') })
            .use({ name: 'third', init: () => order.push('third') })
        expect(order).toEqual(['first', 'second', 'third'])
        core.destroy()
    })

    it('plugin can subscribe to core events during init', async () => {
        const core = new UpupCore({})
        const handler = vi.fn()
        core.use({
            name: 'event-listener',
            init: (emitter) => {
                emitter.on('files-added', handler)
            },
        })
        await core.addFiles([new File(['x'], 'a.txt', { type: 'text/plain' })])
        expect(handler).toHaveBeenCalled()
        core.destroy()
    })

    it('rejects duplicate plugin names', () => {
        const core = new UpupCore({})
        core.use({ name: 'unique', init: () => {} })
        expect(() => core.use({ name: 'unique', init: () => {} })).toThrow()
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
            init: () => {
                core.registerExtension('math', {
                    add: (a: number, b: number) => a + b,
                })
            },
        })
        const math = core.getExtension('math')
        expect(math).toBeDefined()
        expect(math!.add(2, 3)).toBe(5)
        core.destroy()
    })

    it('extensions survive file operations', async () => {
        const core = new UpupCore({})
        core.use({
            name: 'counter-ext',
            init: (emitter) => {
                let count = 0
                emitter.on('files-added', () => count++)
                core.registerExtension('counter', {
                    getCount: () => count,
                })
            },
        })

        await core.addFiles([new File(['a'], 'a.txt', { type: 'text/plain' })])
        await core.addFiles([new File(['b'], 'b.txt', { type: 'text/plain' })])

        const counter = core.getExtension('counter')
        expect(counter!.getCount()).toBe(2)
        core.destroy()
    })

    it('extensions are cleared after destroy', () => {
        const core = new UpupCore({})
        core.use({
            name: 'temp-ext',
            init: () => {
                core.registerExtension('temp', {
                    val: () => 42,
                })
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
        const init = vi.fn()
        const core = new UpupCore({
            plugins: [{ name: 'opt-plug', init }],
        })
        expect(init).toHaveBeenCalledOnce()
        core.destroy()
    })

    it('constructor plugins and use() plugins coexist', () => {
        const inits: string[] = []
        const core = new UpupCore({
            plugins: [{ name: 'from-opts', init: () => inits.push('opts') }],
        })
        core.use({ name: 'from-use', init: () => inits.push('use') })
        expect(inits).toEqual(['opts', 'use'])
        core.destroy()
    })
})

// ─────────────────────────────────────────────
// F-607 — init(emitter) is the one lifecycle hook (setup is retired)
// ─────────────────────────────────────────────
describe('UpupCore.use() — init(emitter) lifecycle hook (F-607)', () => {
    it('accepts a plugin implementing only { name, init } and hands it the emitter', () => {
        const core = new UpupCore({})
        let received: unknown
        const plugin: UpupPlugin = {
            name: 'init-only',
            init: (emitter) => {
                received = emitter
            },
        }
        core.use(plugin)
        // init receives the event bus (has on/emit), NOT the core instance
        expect(received).toBeDefined()
        expect(typeof (received as { on?: unknown }).on).toBe('function')
        expect(typeof (received as { emit?: unknown }).emit).toBe('function')
        core.destroy()
    })

    it('a plugin with no lifecycle hook at all still registers', () => {
        const core = new UpupCore({})
        expect(() => core.use({ name: 'bare' })).not.toThrow()
        core.destroy()
    })

    it('the init emitter is core’s bus — a subscribed handler fires on file events', async () => {
        const core = new UpupCore({})
        const handler = vi.fn()
        core.use({
            name: 'init-subscriber',
            init: (emitter) => {
                emitter.on('files-added', handler)
            },
        })
        await core.addFiles([new File(['x'], 'a.txt', { type: 'text/plain' })])
        expect(handler).toHaveBeenCalled()
        core.destroy()
    })
})
