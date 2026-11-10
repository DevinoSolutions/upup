import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { act, cleanup, render, waitFor } from '@testing-library/react'
import React, { createRef } from 'react'
import { UpupUploader } from '../src'
import type { UploaderRef } from '../src'
import { UploadStatus } from '@useupup/core'

/**
 * #392 — a host holding the `UploaderRef` must be able to retry ONE failed
 * file. `use-upload.test.ts` proves the hook forwards the command against a
 * mocked context; these render the real `<UpupUploader ref>` over a real
 * core, so deleting either the `useUpload()` forward or the `UploaderRef`
 * member's wiring turns them red.
 *
 * Only the two network edges are scripted: the presign `fetch` and the
 * storage PUT (`XMLHttpRequest`). Everything between — controller,
 * orchestrator, core.retry, the upload manager — is the real code.
 */

type PutOutcome = { status: number }

let putOutcomes: Map<string, PutOutcome[]>
let putAttempts: string[]

class ScriptedXhr {
    status = 0
    statusText = ''
    responseText = ''
    upload = { addEventListener: () => {} }
    private listeners: Record<string, Array<() => void>> = {}
    private url = ''

    addEventListener(type: string, cb: () => void) {
        ;(this.listeners[type] ??= []).push(cb)
    }
    open(_method: string, url: string) {
        this.url = url
    }
    setRequestHeader() {}
    abort() {}
    send() {
        const name = decodeURIComponent(this.url.split('/').pop() ?? '')
        putAttempts.push(name)
        const outcome = putOutcomes.get(name)?.shift() ?? { status: 200 }
        queueMicrotask(() => {
            this.status = outcome.status
            this.statusText = outcome.status >= 400 ? 'Server Error' : 'OK'
            this.listeners.load?.forEach(cb => cb())
        })
    }
}

const makeFile = (name: string) =>
    new File([`body of ${name}`], name, { type: 'text/plain' })

function mountUploader() {
    const ref = createRef<UploaderRef>()
    render(
        <UpupUploader
            ref={ref}
            provider="s3"
            uploadEndpoint="/api/presign"
            maxRetries={0}
            crashRecovery={false}
        />,
    )
    return ref
}

describe('UploaderRef.useUpload().retryUpload (#392)', () => {
    beforeEach(() => {
        putOutcomes = new Map()
        putAttempts = []
        vi.stubGlobal('XMLHttpRequest', ScriptedXhr)
        vi.stubGlobal(
            'fetch',
            vi.fn(async (_url: string, init: { body: string }) => {
                const { name } = JSON.parse(init.body) as { name: string }
                return new Response(
                    JSON.stringify({
                        key: `uploads/${name}`,
                        uploadUrl: `https://storage.test/${encodeURIComponent(name)}`,
                        expiresIn: 300,
                    }),
                    { status: 200 },
                )
            }),
        )
    })

    afterEach(() => {
        cleanup()
        vi.unstubAllGlobals()
    })

    it('re-attempts only the failed file when called with its id, and completes it', async () => {
        putOutcomes.set('bad.txt', [{ status: 500 }])
        const ref = mountUploader()

        await act(async () => {
            await ref
                .current!.useUpload()
                .uploadFiles([makeFile('good.txt'), makeFile('bad.txt')])
                .catch(() => undefined)
        })

        await waitFor(() => {
            const files = ref.current!.useUpload().files
            expect(files).toHaveLength(2)
            expect(files.find(f => f.name === 'bad.txt')?.status).toBe(
                UploadStatus.FAILED,
            )
        })
        const failed = ref
            .current!.useUpload()
            .files.find(f => f.name === 'bad.txt')!
        expect(putAttempts.sort()).toEqual(['bad.txt', 'good.txt'])

        // The mechanism under test: the ref must expose the command at all.
        expect(typeof ref.current!.useUpload().retryUpload).toBe('function')

        await act(async () => {
            await ref.current!.useUpload().retryUpload(failed.id)
        })

        // Exactly one more storage PUT, for the failed file only — the file
        // that already succeeded is not re-sent.
        expect(putAttempts.sort()).toEqual(['bad.txt', 'bad.txt', 'good.txt'])
        await waitFor(() => {
            const files = ref.current!.useUpload().files
            expect(files.every(f => f.key != null)).toBe(true)
            expect(files.find(f => f.name === 'bad.txt')?.status).toBe(
                UploadStatus.SUCCESSFUL,
            )
        })
    })
})
