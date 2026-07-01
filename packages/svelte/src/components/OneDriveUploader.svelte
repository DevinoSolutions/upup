<script lang="ts">
  import { useUploaderRuntime, useUploaderSource } from '../context/uploader-context'
  import ClientOneDriveUploader from './ClientOneDriveUploader.svelte'
  import ServerModeDriveUploader from './ServerModeDriveUploader.svelte'

  const { mode } = useUploaderRuntime()
  const { setActiveAdapter } = useUploaderSource()
</script>

{#if mode === 'server'}
  <ServerModeDriveUploader
    provider="onedrive"
    onBack={() => setActiveAdapter(undefined)}
  />
{:else}
  <ClientOneDriveUploader />
{/if}
