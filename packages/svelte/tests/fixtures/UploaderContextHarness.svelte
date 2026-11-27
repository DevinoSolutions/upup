<script lang="ts">
    import { createUploaderContext } from '../../src/context/create-uploader-context'
    import type { UploaderContextHandle } from '../../src/context/create-uploader-context'
    import type { UploaderProps } from '../../src/shared/types'

    interface ContextSink {
        ctx?: UploaderContextHandle
    }

    let { sink, ...rest }: { sink: ContextSink } & UploaderProps = $props()

    // Test-only harness: builds the uploader context from live props without
    // rendering the panel, so a test can reach `ctx.core` and fire core events
    // (a finished upload) that the full component gives no handle on. Like
    // UpupUploader.svelte it hands the props object straight to
    // createUploaderContext, which reads host callbacks from it when they fire.
    // svelte-ignore state_referenced_locally
    sink.ctx = createUploaderContext(rest)
</script>

<div data-testid="uploader-context-harness"></div>
