import { describe, it, expect } from 'vitest'
import { createWorkerProvider } from '../../src/worker/create-worker-provider'
import type { WorkerRequest, WorkerResponse } from '../../src/worker/protocol'

class FakeWorker {
  onmessage: ((e: { data: WorkerResponse }) => void) | null = null
  onerror: ((e: unknown) => void) | null = null
  posted: Array<{ msg: WorkerRequest; transfer?: Transferable[] }> = []
  terminated = false
  postMessage(msg: WorkerRequest, transfer?: Transferable[]) { this.posted.push({ msg, transfer }) }
  terminate() { this.terminated = true }
  respond(res: WorkerResponse) { this.onmessage?.({ data: res }) }
}

const runtimeWith = (w: FakeWorker | null) => ({ createWorker: () => w as unknown as Worker | null })

describe('createWorkerProvider', () => {
  it('returns null when the runtime cannot create a worker', () => {
    expect(createWorkerProvider(runtimeWith(null))).toBeNull()
    expect(createWorkerProvider({ createWorker: undefined })).toBeNull()
  })

  it('posts the task with id + transfers data, resolves with the matching result', async () => {
    const w = new FakeWorker()
    const p = createWorkerProvider(runtimeWith(w))!
    const data = new Uint8Array([1, 2, 3]).buffer
    const promise = p.execute<{ kind: string; checksum: string }>({ type: 'hash', data })
    expect(w.posted[0].msg).toMatchObject({ id: 1, type: 'hash' })
    expect(w.posted[0].transfer).toEqual([data])
    w.respond({ id: 1, ok: true, result: { kind: 'hash', checksum: 'deadbeef' } })
    await expect(promise).resolves.toMatchObject({ kind: 'hash', checksum: 'deadbeef' })
  })

  it('correlates two overlapping calls to the right ids', async () => {
    const w = new FakeWorker()
    const p = createWorkerProvider(runtimeWith(w))!
    const a = p.execute<{ checksum: string }>({ type: 'hash', data: new ArrayBuffer(1) })
    const b = p.execute<{ checksum: string }>({ type: 'hash', data: new ArrayBuffer(1) })
    w.respond({ id: 2, ok: true, result: { kind: 'hash', checksum: 'B' } })
    w.respond({ id: 1, ok: true, result: { kind: 'hash', checksum: 'A' } })
    await expect(a).resolves.toMatchObject({ checksum: 'A' })
    await expect(b).resolves.toMatchObject({ checksum: 'B' })
  })

  it('rejects when the worker reports ok:false', async () => {
    const w = new FakeWorker()
    const p = createWorkerProvider(runtimeWith(w))!
    const promise = p.execute({ type: 'heic', data: new ArrayBuffer(1) })
    w.respond({ id: 1, ok: false, error: 'no codec' })
    await expect(promise).rejects.toThrow('no codec')
  })

  it('rejects on timeout and stops tracking the request', async () => {
    const w = new FakeWorker()
    const p = createWorkerProvider(runtimeWith(w), { timeoutMs: 15 })!
    await expect(p.execute({ type: 'hash', data: new ArrayBuffer(1) })).rejects.toThrow(/timeout/i)
  })

  it('terminate() rejects pending requests and terminates the worker', async () => {
    const w = new FakeWorker()
    const p = createWorkerProvider(runtimeWith(w))!
    const promise = p.execute({ type: 'hash', data: new ArrayBuffer(1) })
    p.terminate()
    expect(w.terminated).toBe(true)
    await expect(promise).rejects.toThrow(/terminated/i)
  })
})
