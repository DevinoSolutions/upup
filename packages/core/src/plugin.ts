export interface UpupPlugin {
  /** Unique name — used for deduplication and debugging */
  name: string
  /** Called once when the plugin is registered */
  setup(core: unknown): void
}

export type ExtensionMethods = Record<string, (...args: any[]) => any>

export class PluginManager {
  private plugins = new Map<string, UpupPlugin>()
  private extensions = new Map<string, ExtensionMethods>()

  register(plugin: UpupPlugin, core: unknown): void {
    if (this.plugins.has(plugin.name)) {
      throw new Error(`Plugin "${plugin.name}" is already registered`)
    }
    this.plugins.set(plugin.name, plugin)
    plugin.setup(core)
  }

  registerExtension(name: string, methods: ExtensionMethods): void {
    if (this.extensions.has(name)) {
      throw new Error(`Extension "${name}" is already registered`)
    }
    this.extensions.set(name, methods)
  }

  getExtension(name: string): ExtensionMethods | undefined {
    return this.extensions.get(name)
  }

  getExtensions(): Record<string, ExtensionMethods> {
    return Object.fromEntries(this.extensions)
  }

  destroy(): void {
    this.plugins.clear()
    this.extensions.clear()
  }
}
