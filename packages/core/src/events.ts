export type EventHandler<T = unknown> = (payload: T) => void

export class EventEmitter<TEvents extends object = Record<string, unknown>> {
    private handlers = new Map<string, Set<EventHandler>>()

    on<K extends string & keyof TEvents>(
        event: K,
        handler: EventHandler<TEvents[K]>,
    ): () => void
    on(event: string, handler: EventHandler): () => void
    on(event: string, handler: EventHandler): () => void {
        let handlers = this.handlers.get(event)
        if (!handlers) {
            handlers = new Set()
            this.handlers.set(event, handlers)
        }
        handlers.add(handler)
        return () => {
            this.off(event, handler)
        }
    }

    off(event: string, handler: EventHandler): void {
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
                    // upup-catch: a consumer listener throwing is not a state/upload
                    // failure — isolate it so siblings still run and it can't escape
                    // emit(); surfaced dev-only, never re-emitted (see note above).
                    if (
                        typeof process !== 'undefined' &&
                        process.env.NODE_ENV !== 'production'
                    ) {
                        console.error(
                            `[upup] listener for "${event}" threw:`,
                            err,
                        )
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
