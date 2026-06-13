// Worker entry — bundled to an IIFE string by scripts/build-worker.mjs.
// Not imported by core.ts and not a tsup entry; runs only inside a Web Worker.
import { handleTask } from './handle-task'

const ctx = self as unknown as DedicatedWorkerGlobalScope

ctx.onmessage = async (event: MessageEvent) => {
  const response = await handleTask(event.data)
  const transfer: Transferable[] = []
  if (response.ok && 'bytes' in response.result) {
    transfer.push(response.result.bytes)
  }
  ctx.postMessage(response, transfer)
}
