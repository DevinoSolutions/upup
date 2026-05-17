import type { EventEmitter } from '../events'
import type { AdapterPlugin } from './plugin'
import type { GoogleDriveConfigs } from './configs'

export class GoogleDrivePlugin implements AdapterPlugin {
    readonly id = 'google-drive'
    readonly name = 'google-drive'
    private emitter: EventEmitter | null = null
    private config: GoogleDriveConfigs = { google_api_key: '', google_app_id: '', google_client_id: '' }

    configure(config: GoogleDriveConfigs): this {
        this.config = config
        return this
    }

    getConfig(): Readonly<GoogleDriveConfigs> {
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
