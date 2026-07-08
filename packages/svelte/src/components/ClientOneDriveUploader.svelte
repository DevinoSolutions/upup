<script lang="ts">
  import { useOneDrive } from '../composables/useOneDrive'
  import DriveAuthFallback from './shared/DriveAuthFallback.svelte'
  import DriveBrowser from './shared/DriveBrowser.svelte'

  const {
    user,
    oneDriveFiles: driveFiles,
    signOut,
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
  } = useOneDrive()

  async function handleSignOut() {
    signOut()
  }
</script>

{#if !$isAuthenticated && !$token && !$isLoading}
  <DriveAuthFallback
    providerName="OneDrive"
    onRetry={authenticate}
    dataUpupSlot="one-drive-uploader"
  />
{:else}
  <DriveBrowser
    {driveFiles}
    {user}
    {handleSignOut}
    dataUpupSlot="one-drive-uploader"
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
