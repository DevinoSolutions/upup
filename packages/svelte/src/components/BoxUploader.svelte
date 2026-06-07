<script lang="ts">
  import { useUploaderRuntime, useUploaderSource } from '../context/root-context'
  import ClientBoxUploader from './ClientBoxUploader.svelte'
  import ServerModeDriveUploader from './ServerModeDriveUploader.svelte'

  const { mode } = useUploaderRuntime()
  const { setActiveAdapter } = useUploaderSource()
</script>

{#if mode === 'server'}
  <ServerModeDriveUploader
    provider="box"
    onBack={() => setActiveAdapter(undefined)}
  />
{:else}
  <ClientBoxUploader />
{/if}
