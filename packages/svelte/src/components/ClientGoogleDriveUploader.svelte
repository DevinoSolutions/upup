<script lang="ts">
  import useGoogleDrive from '../composables/useGoogleDrive'
  import DriveAuthFallback from './shared/DriveAuthFallback.svelte'
  import DriveBrowser from './shared/DriveBrowser.svelte'

  const {
    user,
    googleFiles: driveFiles,
    handleSignOut,
    token,
    authCancelled,
    retryAuth,
    isAuthReady,
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
  } = useGoogleDrive()
</script>

{#if !$token && ($authCancelled || $isAuthReady)}
  <DriveAuthFallback
    providerName="Google Drive"
    onRetry={retryAuth}
    {error}
    dataUpupSlot="google-drive-uploader"
  />
{:else}
  <DriveBrowser
    {driveFiles}
    {user}
    {handleSignOut}
    dataUpupSlot="google-drive-uploader"
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
