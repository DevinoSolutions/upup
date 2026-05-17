import type { EventEmitter } from '../events'
import type { AdapterPlugin } from './plugin'
import type { BoxConfigs } from './configs'

export class BoxPlugin implements AdapterPlugin {
    readonly id = 'box'
    readonly name = 'box'
    private emitter: EventEmitter | null = null
    private config: BoxConfigs = {}

    configure(config: BoxConfigs): this {
        this.config = config
        return this
    }

    getConfig(): Readonly<BoxConfigs> {
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
