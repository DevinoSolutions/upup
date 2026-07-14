import { describe, it, expect, vi } from 'vitest'

// Simulate tus-js-client not being installed. We make the module resolve to
// a value that is NOT a valid module (no `Upload` export), so any usage blows
// up, but more importantly we want the wrapper we're about to add to catch a
// rejected import() and throw an UpupError.  The cleanest way to test the
// try/catch wrapper is to use vi.doMock (not hoisted) inside the test so the
// import() inside upload() sees a rejection.
describe('TusUpload — optional dep missing', () => {
    it('rejects with an actionable UpupError naming tus-js-client', async () => {
        // vi.doMock is not hoisted — it takes effect for subsequent dynamic imports.
        vi.doMock('tus-js-client', () => {
            // Throwing from the factory simulates a module that cannot be resolved;
            // vitest propagates this as a rejection from the dynamic import() call.
            throw new Error("Cannot find module 'tus-js-client'")
        })

        try {
            // Import the module under test AFTER setting up the mock so it picks up
            // the mocked tus-js-client when its upload() method runs.
            const { TusUpload } =
                await import('../../src/strategies/tus-upload')
            const upload = new TusUpload({
                protocol: 'tus',
                endpoint: 'https://example.com/files',
            } as never)
            const file = new File(['hi'], 'a.txt', { type: 'text/plain' })
            const controller = new AbortController()
            await expect(
                upload.upload(file, {} as never, {
                    onProgress: () => {},
                    signal: controller.signal,
                }),
            ).rejects.toThrow(/tus-js-client/)
        } finally {
            vi.doUnmock('tus-js-client')
            vi.resetModules()
        }
    })
})
