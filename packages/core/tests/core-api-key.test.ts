import { describe, it, expect, vi, beforeEach } from 'vitest'
import { UpupCore } from '../src/core'
import type { CoreOptions } from '../src/core'

const mockFetch = vi.fn()
vi.stubGlobal('fetch', mockFetch)

// apiKey is a retired legacy field, no longer part of CoreOptions — cast at
// this boundary to exercise the removal behavior for old callers.
const legacyApiKeyOptions = { apiKey: 'key_abc123' } as unknown as CoreOptions

describe('UpupCore hosted apiKey removal', () => {
    beforeEach(() => {
        vi.clearAllMocks()
    })

    // The serverUrl-inference check this file used to open with is implied by
    // the test below: if a managed serverUrl had been inferred, upload() would
    // have had a target and could not reject with NO_UPLOAD_TARGET.
    it('does not upload through the retired managed apiKey path', async () => {
        const core = new UpupCore(legacyApiKeyOptions)
        await core.addFiles([
            new File(['data'], 'test.png', { type: 'image/png' }),
        ])

        await expect(core.upload()).rejects.toMatchObject({
            name: 'UpupConfigError',
            code: 'NO_UPLOAD_TARGET',
        })
        expect(mockFetch).not.toHaveBeenCalled()
    })
})
