// @vitest-environment jsdom
import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { beforeEach, describe, expect, it, vi } from 'vitest'

// The demo uploader on /mobile-demo is multipart-resumable: a >5 MiB file
// leaves an in-progress multipart upload on the bucket plus an `upup_mp_*`
// localStorage session. Without `crashRecovery` a reload brought back an empty
// dropzone — the file the session belongs to was gone, so the orphan could
// never be resumed or discarded from the UI. These pin that the demo opts in.
const captured = vi.hoisted(() => ({
    props: undefined as Record<string, unknown> | undefined,
}))

vi.mock('@useupup/react', () => ({
    UpupUploader: (props: Record<string, unknown>) => {
        captured.props = props
        return null
    },
}))
vi.mock('@useupup/react/styles', () => ({}))

import Uploader from '@/components/Uploader'

function renderDemoUploader(): Record<string, unknown> {
    renderToStaticMarkup(createElement(Uploader, { limit: 1, mini: false }))
    if (!captured.props) throw new Error('UpupUploader was never rendered')
    return captured.props
}

describe('landing demo uploader crash recovery', () => {
    beforeEach(() => {
        captured.props = undefined
    })

    it('enables the public crashRecovery option so a reload restores the file', () => {
        expect(renderDemoUploader().crashRecovery).toBe(true)
    })

    it('keeps multipart resume on, which is what makes crash recovery matter', () => {
        expect(renderDemoUploader().resumable).toEqual({
            protocol: 'multipart',
        })
    })
})
