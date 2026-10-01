import { describe, expect, it } from 'vitest'
import {
    DEMO_UPLOAD_TARGETS,
    interactiveExampleEnvProps,
} from '@/lib/interactive-example-props'

// The homepage demo shipped with no upload target, so every Upload click
// ended in NO_UPLOAD_TARGET. These pin the seeding; the real upload is proven
// end to end by apps/e2e-test/landing/demo-upload.spec.ts.
describe('interactiveExampleEnvProps upload targets', () => {
    it('seeds both demo upload targets into the initial config', () => {
        const { initialConfig } = interactiveExampleEnvProps()
        expect(initialConfig?.uploadEndpoint).toBe('/api/upup/presign/')
        expect(initialConfig?.serverUrl).toBe('/api/upup')
    })

    it('points the endpoint at the slashed presign route so the POST skips a 308', () => {
        expect(DEMO_UPLOAD_TARGETS.uploadEndpoint.endsWith('/')).toBe(true)
    })

    it('lets a page-supplied upload target win over the demo default', () => {
        const { initialConfig } = interactiveExampleEnvProps({
            initialConfig: { uploadEndpoint: '/custom/presign/' },
        })
        expect(initialConfig?.uploadEndpoint).toBe('/custom/presign/')
        expect(initialConfig?.serverUrl).toBe('/api/upup')
    })
})
