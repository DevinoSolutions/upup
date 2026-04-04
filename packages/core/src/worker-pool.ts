export type WorkerTask =
  | { type: 'hash-partial'; data: ArrayBuffer }
  | { type: 'hash-full'; data: ArrayBuffer }
  | { type: 'gzip'; data: ArrayBuffer }

async function mainThreadHash(data: ArrayBuffer): Promise<string> {
  const hashBuffer = await crypto.subtle.digest('SHA-256', data)
  return Array.from(new Uint8Array(hashBuffer))
    .map(b => b.toString(16).padStart(2, '0'))
    .join('')
}

async function mainThreadGzip(data: ArrayBuffer): Promise<ArrayBuffer> {
  // Try CompressionStream API (modern browsers)
  if (typeof CompressionStream !== 'undefined') {
    const stream = new Blob([data]).stream().pipeThrough(new CompressionStream('gzip'))
    const blob = await new Response(stream).blob()
    return blob.arrayBuffer()
  }
  // Fallback: return uncompressed (pako can be used when available)
  return data
}

export class WorkerPool {
  private workers: Worker[] = []
  private maxWorkers: number
  private workerAvailable: boolean

  constructor(options?: { maxWorkers?: number }) {
    this.maxWorkers = options?.maxWorkers ?? (typeof navigator !== 'undefined' ? navigator?.hardwareConcurrency ?? 2 : 2)
    this.workerAvailable = typeof Worker !== 'undefined'
  }

  async execute<T = unknown>(task: WorkerTask): Promise<T> {
    // Always fall back to main thread for now
    // Worker support will be enabled when inline worker code is bundled
    return this.executeMainThread(task) as T
  }

  private async executeMainThread(task: WorkerTask): Promise<unknown> {
    switch (task.type) {
      case 'hash-partial':
      case 'hash-full':
        return mainThreadHash(task.data)
      case 'gzip':
        return mainThreadGzip(task.data)
      default:
        throw new Error(`Unknown worker task type: ${(task as any).type}`)
    }
  }

  destroy(): void {
    for (const worker of this.workers) {
      worker.terminate()
    }
    this.workers = []
  }
}
