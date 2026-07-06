export type WorkerTaskType = 'hash' | 'heic' | 'exif' | 'thumbnail' | 'compress'

/** Everything the worker needs beyond the raw bytes. All optional. */
export interface WorkerParams {
    mime?: string
    name?: string
    quality?: number
    maxWidthOrHeight?: number
    maxSizeMB?: number
}

/** What the provider posts to the worker (public task + correlation id). */
export interface WorkerRequest {
    id: number
    type: WorkerTaskType
    data: ArrayBuffer
    params?: WorkerParams | undefined
}

export type WorkerResult =
    | { kind: 'hash'; checksum: string }
    | {
          kind: 'thumbnail'
          thumbnailUrl: string
          bytes: ArrayBuffer
          type: string
          name: string
      }
    | {
          kind: 'image'
          bytes: ArrayBuffer
          type: string
          name?: string
          metadata?: Record<string, unknown>
      }

export type WorkerResponse =
    | { id: number; ok: true; result: WorkerResult }
    | { id: number; ok: false; error: string }
