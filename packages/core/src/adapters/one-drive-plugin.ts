import type { EventEmitter } from '../events'
import type { AdapterPlugin } from './plugin'
import type { OneDriveConfigs } from './configs'

export class OneDrivePlugin implements AdapterPlugin {
    readonly id = 'one-drive'
    readonly name = 'one-drive'
    private emitter: EventEmitter | null = null
    private config: OneDriveConfigs = { onedrive_client_id: '' }

    configure(config: OneDriveConfigs): this {
        this.config = config
        return this
    }

    getConfig(): Readonly<OneDriveConfigs> {
        return this.config
    }

    setup(_core: unknown): void {}

    init(emitter: EventEmitter): void {
        this.emitter = emitter
    }

    destroy(): void {
        this.emitter = null
    }
}
