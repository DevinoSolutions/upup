// @vitest-environment node
import { describe, it, expect } from 'vitest'
import { render } from 'svelte/server'
import UpupUploader from '../src/UpupUploader.svelte'

describe('UpupUploader SSR', () => {
    it('renders the container shell on the server without touching window', () => {
        const { body } = render(UpupUploader, { props: { sources: ['local'] } })
        expect(body).toContain('data-testid="upup-container"')
        expect(body).toContain('upup-scope')
    })
})
