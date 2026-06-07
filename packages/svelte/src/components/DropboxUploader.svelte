<script lang="ts">
  import { useUploaderRuntime, useUploaderSource } from '../context/root-context'
  import ClientDropboxUploader from './ClientDropboxUploader.svelte'
  import ServerModeDriveUploader from './ServerModeDriveUploader.svelte'

  const { mode } = useUploaderRuntime()
  const { setActiveAdapter } = useUploaderSource()
</script>

{#if mode === 'server'}
  <ServerModeDriveUploader
    provider="dropbox"
    onBack={() => setActiveAdapter(undefined)}
  />
{:else}
  <ClientDropboxUploader />
{/if}
