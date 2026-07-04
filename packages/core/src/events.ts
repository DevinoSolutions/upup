export type EventHandler<T = unknown> = (payload: T) => void

export class EventEmitter<TEvents extends object = Record<string, unknown>> {
  private handlers = new Map<string, Set<EventHandler<unknown>>>()

  on<K extends string & keyof TEvents>(
    event: K,
    handler: EventHandler<TEvents[K]>,
  ): () => void
  on(event: string, handler: EventHandler<unknown>): () => void
  on(event: string, handler: EventHandler<unknown>): () => void {
    if (!this.handlers.has(event)) {
      this.handlers.set(event, new Set())
    }
    this.handlers.get(event)!.add(handler as EventHandler<unknown>)
    return () => this.off(event, handler as EventHandler<unknown>)
  }

  off(event: string, handler: EventHandler<unknown>): void {
    this.handlers.get(event)?.delete(handler)
  }

  emit<K extends string & keyof TEvents>(event: K, payload: TEvents[K]): void
  emit(event: string, payload?: unknown): void
  emit(event: string, payload?: unknown): void {
    const handlers = this.handlers.get(event)
    if (handlers) {
      for (const handler of handlers) {
        // A consumer's listener throwing is NOT a state/upload failure. Isolate each
        // handler so one throw can't abort the others or escape emit() and misattribute
        // a render bug as a pipeline error. Report dev-only; never re-emit.
        try {
          handler(payload)
        } catch (err) {
          if (typeof process !== 'undefined' && process.env?.NODE_ENV !== 'production') {
            console.error(`[upup] listener for "${event}" threw:`, err)
          }
        }
      }
    }
  }

  removeAllListeners(event?: string): void {
    if (event) {
      this.handlers.delete(event)
    } else {
      this.handlers.clear()
    }
  }
}
