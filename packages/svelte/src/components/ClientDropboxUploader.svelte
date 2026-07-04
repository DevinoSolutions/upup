<script lang="ts">
  import { useDropbox } from '../composables/useDropbox'
  import DriveAuthFallback from './shared/DriveAuthFallback.svelte'
  import DriveBrowser from './shared/DriveBrowser.svelte'

  const {
    user,
    dropboxFiles: driveFiles,
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
    error,
    hasMore,
    isLoadingMore,
    loadMore,
  } = useDropbox()

  async function handleSignOut() {
    logout()
  }
</script>

{#if !$isAuthenticated && !$token && !$isLoading}
  <DriveAuthFallback
    providerName="Dropbox"
    onRetry={authenticate}
    dataUpupSlot="dropbox-uploader"
  />
{:else}
  <DriveBrowser
    {driveFiles}
    {user}
    {handleSignOut}
    dataUpupSlot="dropbox-uploader"
    {path}
    {setPath}
    {isClickLoading}
    {handleClick}
    {selectedFiles}
    {showLoader}
    {handleSubmit}
    {handleCancelDownload}
    {onSelectCurrentFolder}
    {error}
    {hasMore}
    {isLoadingMore}
    {loadMore}
  />
{/if}
