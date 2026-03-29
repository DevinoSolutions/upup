import { describe, it, expect, vi } from 'vitest'
import { PluginManager } from '../src/plugin'
import type { UpupPlugin } from '../src/plugin'

describe('PluginManager', () => {
  it('registers a plugin and calls setup with core', () => {
    const manager = new PluginManager()
    const setup = vi.fn()
    const plugin: UpupPlugin = { name: 'test', setup }
    const mockCore = { fake: true }

    manager.register(plugin, mockCore)

    expect(setup).toHaveBeenCalledOnce()
    expect(setup).toHaveBeenCalledWith(mockCore)
  })

  it('rejects duplicate plugin names', () => {
    const manager = new PluginManager()
    manager.register({ name: 'dupe', setup: () => {} }, {})

    expect(() => manager.register({ name: 'dupe', setup: () => {} }, {}))
      .toThrow('Plugin "dupe" is already registered')
  })

  it('registers and retrieves extensions', () => {
    const manager = new PluginManager()
    const methods = {
      greet: (name: string) => `hello ${name}`,
    }

    manager.registerExtension('greeter', methods)

    expect(manager.getExtension('greeter')).toBe(methods)
    expect(manager.getExtension('greeter')!.greet('world')).toBe('hello world')
  })

  it('returns undefined for unknown extensions', () => {
    const manager = new PluginManager()
    expect(manager.getExtension('nonexistent')).toBeUndefined()
  })

  it('rejects duplicate extension names', () => {
    const manager = new PluginManager()
    manager.registerExtension('ext', { fn: () => {} })

    expect(() => manager.registerExtension('ext', { fn: () => {} }))
      .toThrow('Extension "ext" is already registered')
  })

  it('plugin can register extensions during setup', () => {
    const manager = new PluginManager()
    const plugin: UpupPlugin = {
      name: 'with-ext',
      setup: () => {
        manager.registerExtension('myExt', {
          getValue: () => 42,
        })
      },
    }

    manager.register(plugin, {})

    expect(manager.getExtension('myExt')!.getValue()).toBe(42)
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
    manager.register({ name: 'test', setup: () => {} }, {})
    manager.registerExtension('ext', { fn: () => {} })

    manager.destroy()

    expect(manager.getExtension('ext')).toBeUndefined()
  })
})
