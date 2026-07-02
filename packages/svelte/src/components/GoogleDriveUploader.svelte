<script lang="ts">
  import { useUploaderRuntime, useUploaderSource } from '../context/uploader-context'
  import ClientGoogleDriveUploader from './ClientGoogleDriveUploader.svelte'
  import ServerModeDriveUploader from './ServerModeDriveUploader.svelte'

  const { mode } = useUploaderRuntime()
  const { setActiveSource } = useUploaderSource()
</script>

{#if mode === 'server'}
  <ServerModeDriveUploader
    provider="google-drive"
    onBack={() => setActiveSource(undefined)}
  />
{:else}
  <ClientGoogleDriveUploader />
{/if}
