import type { UpupPlugin } from '../plugin'
import type { EventEmitter } from '../events'

export interface AdapterPlugin extends UpupPlugin {
  readonly id: string
  init(emitter: EventEmitter): void
  destroy(): void
}
