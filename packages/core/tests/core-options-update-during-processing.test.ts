// Contract: an options update that lands while a run is preparing its
// pipeline must not take the pipeline away from that run.
//
// runUpload builds the auto-pipeline, then awaits the worker modules (dynamic
// imports), and only then calls processAll. updateOptions used to drop the
// cached pipeline whenever a pipeline flag was merely PRESENT in the partial,
// and `@useupup/react` passes the whole options object on every parent
// re-render. So a re-render during that await left runUpload calling
// processAll on null: "Cannot read properties of null (reading 'processAll')".
// Seen in about half of local runs of a host app's upload journeys.

import { describe, it, expect, vi, afterEach } from 'vitest'
import { UpupCore, type CoreOptions } from '../src/core'
import { UpupErrorCode } from '@useupup/core'
import * as eligibilityModule from '../src/worker/eligibility'
import * as buildAutoPipelineModule from '../src/pipeline/build-auto-pipeline'

afterEach(() => {
    vi.restoreAllMocks()
})

/** Runs `duringWorkerSetup` at the exact point the race needs: after the run
 *  built its pipeline, while it is still setting up the worker, before
 *  processAll. Workers stay off, as they are in this node environment. */
function onWorkerSetup(duringWorkerSetup: () => void): void {
    vi.spyOn(eligibilityModule, 'isWorkerEligible').mockImplementation(() => {
        duringWorkerSetup()
        return false
    })
}

async function coreWithOneFile(options: CoreOptions): Promise<UpupCore> {
    const core = new UpupCore(options)
    await core.setFiles([new File(['hello'], 'a.txt', { type: 'text/plain' })])
    return core
}

describe('updateOptions during the PROCESSING phase of a run', () => {
    it('a re-render passing the same options mid-run leaves the run its pipeline, and the file is still processed', async () => {
        const options: CoreOptions = { checksumVerification: true }
        const core = await coreWithOneFile(options)
        onWorkerSetup(() => {
            core.updateOptions({ ...options })
        })

        // No upload target is configured: the run is expected to get through
        // the pipeline and stop at the transfer with that error, not before.
        await expect(core.upload()).rejects.toMatchObject({
            code: UpupErrorCode.NO_UPLOAD_TARGET,
        })

        expect([...core.files.values()][0]?.checksumSHA256).toHaveLength(64)
        core.destroy()
    })

    it('a pipeline flag that really changes mid-run does not crash the run already using the old pipeline', async () => {
        const core = await coreWithOneFile({ checksumVerification: true })
        onWorkerSetup(() => {
            core.updateOptions({ checksumVerification: false })
        })

        await expect(core.upload()).rejects.toMatchObject({
            code: UpupErrorCode.NO_UPLOAD_TARGET,
        })

        expect([...core.files.values()][0]?.checksumSHA256).toHaveLength(64)
        core.destroy()
    })
})

describe('updateOptions and the cached auto-pipeline', () => {
    it('keeps the cached pipeline when the pipeline flags are passed again unchanged', async () => {
        const build = vi.spyOn(buildAutoPipelineModule, 'buildAutoPipeline')
        const options: CoreOptions = { checksumVerification: true }
        const core = await coreWithOneFile(options)

        await core.upload().catch(() => {
            // upup-catch: no upload target configured; only the pipeline build is under test
        })
        core.updateOptions({ ...options })
        await core.upload().catch(() => {
            // upup-catch: no upload target configured; only the pipeline build is under test
        })

        expect(build).toHaveBeenCalledTimes(1)
        core.destroy()
    })

    it('rebuilds the pipeline on the next run when a pipeline flag changes value', async () => {
        const build = vi.spyOn(buildAutoPipelineModule, 'buildAutoPipeline')
        const core = await coreWithOneFile({ checksumVerification: true })

        await core.upload().catch(() => {
            // upup-catch: no upload target configured; only the pipeline build is under test
        })
        core.updateOptions({ stripExifData: true })
        await core.upload().catch(() => {
            // upup-catch: no upload target configured; only the pipeline build is under test
        })

        expect(build).toHaveBeenCalledTimes(2)
        core.destroy()
    })
})
