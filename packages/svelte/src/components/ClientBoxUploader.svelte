<script lang="ts">
  import { useBox } from '../composables/useBox'
  import DriveAuthFallback from './shared/DriveAuthFallback.svelte'
  import DriveBrowser from './shared/DriveBrowser.svelte'

  const {
    user,
    boxFiles: driveFiles,
    logout,
    token,
    isAuthenticated,
    authenticate,
    isLoading,
    path,
    setPath,
    isClickLoading,
    handleClick,
    selectedFiles,
    showLoader,
    handleSubmit,
    handleCancelDownload,
    onSelectCurrentFolder,
  } = useBox()

  async function handleSignOut() {
    logout()
  }
</script>

{#if !$isAuthenticated && !$token && !$isLoading}
  <DriveAuthFallback
    providerName="Box"
    onRetry={authenticate}
    dataUpupSlot="box-uploader"
  />
{:else}
  <DriveBrowser
    {driveFiles}
    {user}
    {handleSignOut}
    dataUpupSlot="box-uploader"
    {path}
    {setPath}
    {isClickLoading}
    {handleClick}
    {selectedFiles}
    {showLoader}
    {handleSubmit}
    {handleCancelDownload}
    {onSelectCurrentFolder}
  />
{/if}
