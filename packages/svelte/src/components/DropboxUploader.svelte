<script lang="ts">
  import { useUploaderRuntime, useUploaderSource } from '../context/uploader-context'
  import ClientDropboxUploader from './ClientDropboxUploader.svelte'
  import ServerModeDriveUploader from './ServerModeDriveUploader.svelte'

  const { mode } = useUploaderRuntime()
  const { setActiveSource } = useUploaderSource()
</script>

{#if mode === 'server'}
  <ServerModeDriveUploader
    provider="dropbox"
    onBack={() => setActiveSource(undefined)}
  />
{:else}
  <ClientDropboxUploader />
{/if}
