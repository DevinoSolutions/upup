<script lang="ts">
    import { UpupUploader } from '@useupup/svelte'
    import '@useupup/svelte/styles'
</script>

<UpupUploader provider="aws" uploadEndpoint="/api/upload-token" />
