// Worker entry — emitted as a code-split { type: 'module' } chunk by tsup
// (see tsup.config.ts) and resolved by the consumer bundler via
// new Worker(new URL('./pipeline-worker.js', import.meta.url)). Runs only
// inside a Web Worker.
import { handleTask } from './handle-task'
import type { WorkerRequest } from './protocol'

const ctx = self as unknown as DedicatedWorkerGlobalScope

ctx.onmessage = async (event: MessageEvent<WorkerRequest>) => {
    const response = await handleTask(event.data)
    const transfer: Transferable[] = []
    if (response.ok && 'bytes' in response.result) {
        transfer.push(response.result.bytes)
    }
    ctx.postMessage(response, transfer)
}
