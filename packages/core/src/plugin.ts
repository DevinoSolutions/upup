import type { EventEmitter } from './events'
import { UpupConfigError } from './errors'

export interface UpupPlugin {
    /** Unique name — used for deduplication and debugging */
    name: string
    /**
     * Called once when the plugin is registered, with core's event bus. The one
     * plugin lifecycle hook (F-607) — a plugin subscribes to core events and
     * emits its own through this emitter. Optional: a plugin that only needs
     * registration (dedup + storage) may omit it.
     */
    init?(emitter: EventEmitter): void
}

export type ExtensionMethods = Record<string, (...args: unknown[]) => unknown>

export class PluginManager {
    private plugins = new Map<string, UpupPlugin>()
    private extensions = new Map<string, ExtensionMethods>()

    register(plugin: UpupPlugin): void {
        if (this.plugins.has(plugin.name)) {
            throw new UpupConfigError(
                `Plugin "${plugin.name}" is already registered`,
                'PLUGIN_ALREADY_REGISTERED',
            )
        }
        this.plugins.set(plugin.name, plugin)
        // The plugin's lifecycle hook is init(emitter), invoked by UpupCore.use()
        // after registration (F-607). register() only dedups + stores.
    }

    registerExtension(name: string, methods: ExtensionMethods): void {
        if (this.extensions.has(name)) {
            throw new UpupConfigError(
                `Extension "${name}" is already registered`,
                'EXTENSION_ALREADY_REGISTERED',
            )
        }
        this.extensions.set(name, methods)
    }

    getPlugin(name: string): UpupPlugin | undefined {
        return this.plugins.get(name)
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
