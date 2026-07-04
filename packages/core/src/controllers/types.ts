/** The uniform observer surface every hoisted core controller exposes. */
export interface ObservableController<TSnapshot = unknown> {
    /** Subscribe to change notifications; returns an unsubscribe. */
    subscribe(listener: () => void): () => void
    /** Current immutable snapshot — referentially stable until a change occurs. */
    getSnapshot(): TSnapshot
    /** Tear down internal subscriptions/listeners. Idempotent. */
    destroy(): void
}
