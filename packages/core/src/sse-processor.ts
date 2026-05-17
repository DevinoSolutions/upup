type OnMessage = (data: Record<string, unknown>) => void
type OnError = (error: Error) => void

function withProcessingKey(endpoint: string, key: string): string {
    const hashIndex = endpoint.indexOf('#')
    const beforeHash = hashIndex >= 0 ? endpoint.slice(0, hashIndex) : endpoint
    const hash = hashIndex >= 0 ? endpoint.slice(hashIndex) : ''
    const queryIndex = beforeHash.indexOf('?')
    const path = queryIndex >= 0 ? beforeHash.slice(0, queryIndex) : beforeHash
    const query = queryIndex >= 0 ? beforeHash.slice(queryIndex + 1) : ''
    const params = new URLSearchParams(query)
    params.set('key', key)
    return `${path}?${params.toString()}${hash}`
}

export class SSEProcessor {
    private sources = new Map<string, EventSource>()
    private timers = new Map<string, ReturnType<typeof setTimeout>>()

    subscribe(
        key: string,
        endpoint: string,
        onMessage: OnMessage,
        onError: OnError,
        timeout = 60_000,
    ): void {
        if (this.sources.has(key)) return

        const url = withProcessingKey(endpoint, key)
        const source = new EventSource(url)
        this.sources.set(key, source)

        const cleanup = () => {
            this.unsubscribe(key)
        }

        const timer = setTimeout(() => {
            onError(new Error(`Processing timed out for ${key}`))
            cleanup()
        }, timeout)
        this.timers.set(key, timer)

        source.onmessage = (event) => {
            clearTimeout(timer)
            this.timers.delete(key)
            let data: Record<string, unknown>
            try {
                data = JSON.parse(event.data) as Record<string, unknown>
            } catch {
                data = { raw: event.data }
            }
            onMessage(data)
            cleanup()
        }

        source.onerror = () => {
            clearTimeout(timer)
            this.timers.delete(key)
            onError(new Error(`Processing stream failed for ${key}`))
            cleanup()
        }
    }

    unsubscribe(key: string): void {
        const source = this.sources.get(key)
        if (source) {
            source.close()
            this.sources.delete(key)
        }
        const timer = this.timers.get(key)
        if (timer) {
            clearTimeout(timer)
            this.timers.delete(key)
        }
    }

    destroy(): void {
        this.sources.forEach(s => s.close())
        this.sources.clear()
        this.timers.forEach(t => clearTimeout(t))
        this.timers.clear()
    }
}
