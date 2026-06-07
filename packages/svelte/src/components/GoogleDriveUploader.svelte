<script lang="ts">
  import { useUploaderRuntime, useUploaderSource } from '../context/root-context'
  import ClientGoogleDriveUploader from './ClientGoogleDriveUploader.svelte'
  import ServerModeDriveUploader from './ServerModeDriveUploader.svelte'

  const { mode } = useUploaderRuntime()
  const { setActiveAdapter } = useUploaderSource()
</script>

{#if mode === 'server'}
  <ServerModeDriveUploader
    provider="google-drive"
    onBack={() => setActiveAdapter(undefined)}
  />
{:else}
  <ClientGoogleDriveUploader />
{/if}
