<script lang="ts">
    import { useUpupUpload } from '../../src/use-upup-upload'
    import type {
        UseUpupUploadOptions,
        UseUpupUploadReturn,
    } from '../../src/use-upup-upload'

    interface ResultSink {
        result?: UseUpupUploadReturn
    }

    let { options, sink }: { options: UseUpupUploadOptions; sink: ResultSink } =
        $props()

    // Test-only harness: useUpupUpload's onMount/onDestroy registration needs a
    // real component instance (Svelte's lifecycle hooks throw outside one) —
    // mirrors @useupup/vue's tests/helpers.ts `withSetup`, which uses `createApp`
    // for the same reason. `sink` is a plain object ref the test pre-creates so
    // it can read the composable's return value back out of this component,
    // the same one-shot-capture shape as UpupUploader.svelte's own `const ctx =
    // createUploaderContext(props)`.
    // svelte-ignore state_referenced_locally
    sink.result = useUpupUpload(options)
</script>

<div data-testid="use-upup-upload-harness"></div>
