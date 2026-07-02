<script lang="ts">
  import { useUploaderRuntime, useUploaderSource } from '../context/uploader-context'
  import ClientOneDriveUploader from './ClientOneDriveUploader.svelte'
  import ServerModeDriveUploader from './ServerModeDriveUploader.svelte'

  const { mode } = useUploaderRuntime()
  const { setActiveSource } = useUploaderSource()
</script>

{#if mode === 'server'}
  <ServerModeDriveUploader
    provider="onedrive"
    onBack={() => setActiveSource(undefined)}
  />
{:else}
  <ClientOneDriveUploader />
{/if}
