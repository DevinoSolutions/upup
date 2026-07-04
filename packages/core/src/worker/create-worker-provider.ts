import type { RuntimeAdapter } from '../contracts'
import type { WorkerRequest, WorkerResponse, WorkerParams } from './protocol'

export interface WorkerProvider {
    execute<T>(task: {
        type: string
        data: ArrayBuffer
        params?: Record<string, unknown>
    }): Promise<T>
    terminate(): void
}

const DEFAULT_TIMEOUT_MS = 30_000

interface Pending {
    resolve: (value: unknown) => void
    reject: (error: Error) => void
    timer: ReturnType<typeof setTimeout>
}

export function createWorkerProvider(
    runtime: Pick<RuntimeAdapter, 'createWorker'>,
    options: { timeoutMs?: number } = {},
): WorkerProvider | null {
    const worker = runtime.createWorker?.() ?? null
    if (!worker) return null

    const timeoutMs = options.timeoutMs ?? DEFAULT_TIMEOUT_MS
    const pending = new Map<number, Pending>()
    let nextId = 1

    const settle = (id: number): Pending | undefined => {
        const p = pending.get(id)
        if (p) {
            clearTimeout(p.timer)
            pending.delete(id)
        }
        return p
    }

    worker.onmessage = (event: MessageEvent) => {
        const res = event.data as WorkerResponse
        const p = settle(res.id)
        if (!p) return
        if (res.ok) p.resolve(res.result)
        else p.reject(new Error(res.error))
    }

    worker.onerror = () => {
        for (const [id] of [...pending])
            settle(id)?.reject(new Error('worker error'))
    }

    return {
        execute<T>(task: {
            type: string
            data: ArrayBuffer
            params?: Record<string, unknown>
        }): Promise<T> {
            return new Promise<T>((resolve, reject) => {
                const id = nextId++
                const timer = setTimeout(() => {
                    if (pending.delete(id))
                        reject(new Error(`worker timeout after ${timeoutMs}ms`))
                }, timeoutMs)
                pending.set(id, {
                    resolve: resolve as (v: unknown) => void,
                    reject,
                    timer,
                })
                const req: WorkerRequest = {
                    id,
                    type: task.type as WorkerRequest['type'],
                    data: task.data,
                    params: task.params as WorkerParams | undefined,
                }
                worker.postMessage(req, [task.data])
            })
        },
        terminate(): void {
            for (const [id] of [...pending])
                settle(id)?.reject(new Error('worker terminated'))
            worker.terminate()
        },
    }
}
