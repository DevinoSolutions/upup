import { describe, it, expect } from 'vitest'
import { PluginManager } from '../src/plugin'
import type { UpupPlugin, ExtensionMethods } from '../src/plugin'

describe('PluginManager', () => {
    it('registers and retrieves a plugin', () => {
        const manager = new PluginManager()
        const plugin: UpupPlugin = { name: 'test' }

        // register() only dedups + stores; the lifecycle hook init(emitter) is
        // invoked later by UpupCore.use() (F-607), not by register().
        manager.register(plugin)

        expect(manager.getPlugin('test')).toBe(plugin)
    })

    it('rejects duplicate plugin names', () => {
        const manager = new PluginManager()
        manager.register({ name: 'dupe' })

        expect(() => manager.register({ name: 'dupe' })).toThrow(
            'Plugin "dupe" is already registered',
        )
    })

    it('registers and retrieves extensions', () => {
        const manager = new PluginManager()
        const methods = {
            greet: (name: string) => `hello ${name}`,
        }

        manager.registerExtension(
            'greeter',
            methods as unknown as ExtensionMethods,
        )

        expect(manager.getExtension('greeter')).toBe(methods)
        expect(manager.getExtension('greeter')!.greet!('world')).toBe(
            'hello world',
        )
    })

    it('returns undefined for unknown extensions', () => {
        const manager = new PluginManager()
        expect(manager.getExtension('nonexistent')).toBeUndefined()
    })

    it('rejects duplicate extension names', () => {
        const manager = new PluginManager()
        manager.registerExtension('ext', { fn: () => {} })

        expect(() =>
            manager.registerExtension('ext', { fn: () => {} }),
        ).toThrow('Extension "ext" is already registered')
    })

    it('registers extensions independently of plugins', () => {
        const manager = new PluginManager()
        manager.register({ name: 'with-ext' })
        manager.registerExtension('myExt', {
            getValue: () => 42,
        })

        expect(manager.getExtension('myExt')!.getValue!()).toBe(42)
    })

    it('returns all extensions via getExtensions()', () => {
        const manager = new PluginManager()
        manager.registerExtension('a', { fn: () => 'a' })
        manager.registerExtension('b', { fn: () => 'b' })

        const all = manager.getExtensions()

        expect(Object.keys(all)).toEqual(['a', 'b'])
    })

    it('cleans up everything on destroy()', () => {
        const manager = new PluginManager()
        manager.register({ name: 'test' })
        manager.registerExtension('ext', { fn: () => {} })

        manager.destroy()

        expect(manager.getExtension('ext')).toBeUndefined()
    })
})
