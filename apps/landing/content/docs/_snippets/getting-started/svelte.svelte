<script lang="ts">
    import { UpupUploader } from '@upupjs/svelte'
    import '@upupjs/svelte/styles'
</script>

<UpupUploader provider="aws" uploadEndpoint="/api/upload-token" />
