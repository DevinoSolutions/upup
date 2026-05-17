import type { EventEmitter } from '../events'
import type { AdapterPlugin } from './plugin'
import type { DropboxConfigs } from './configs'

export class DropboxPlugin implements AdapterPlugin {
    readonly id = 'dropbox'
    readonly name = 'dropbox'
    private emitter: EventEmitter | null = null
    private config: DropboxConfigs = {}

    configure(config: DropboxConfigs): this {
        this.config = config
        return this
    }

    getConfig(): Readonly<DropboxConfigs> {
        return this.config
    }

    setup(_core: unknown): void {
        // Called by PluginManager.register
    }

    init(emitter: EventEmitter): void {
        this.emitter = emitter
    }

    destroy(): void {
        this.emitter = null
    }
}
