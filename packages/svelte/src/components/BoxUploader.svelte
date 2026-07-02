<script lang="ts">
  import { useUploaderRuntime, useUploaderSource } from '../context/uploader-context'
  import ClientBoxUploader from './ClientBoxUploader.svelte'
  import ServerModeDriveUploader from './ServerModeDriveUploader.svelte'

  const { mode } = useUploaderRuntime()
  const { setActiveSource } = useUploaderSource()
</script>

{#if mode === 'server'}
  <ServerModeDriveUploader
    provider="box"
    onBack={() => setActiveSource(undefined)}
  />
{:else}
  <ClientBoxUploader />
{/if}
