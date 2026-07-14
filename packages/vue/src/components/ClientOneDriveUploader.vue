<script setup lang="ts">
import { useOneDrive } from '../composables/useOneDrive'
import DriveAuthFallback from './shared/DriveAuthFallback.vue'
import DriveBrowser from './shared/DriveBrowser.vue'

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

<template>
    <DriveAuthFallback
        v-if="!isAuthenticated && !token && !isLoading"
        provider-name="OneDrive"
        :on-retry="authenticate"
        data-upup-slot="one-drive-uploader"
    />
    <DriveBrowser
        v-else
        :drive-files="driveFiles"
        :user="user"
        :handle-sign-out="handleSignOut"
        data-upup-slot="one-drive-uploader"
        :path="path"
        :set-path="setPath"
        :is-click-loading="isClickLoading"
        :handle-click="handleClick"
        :selected-files="selectedFiles"
        :show-loader="showLoader"
        :handle-submit="handleSubmit"
        :handle-cancel-download="handleCancelDownload"
        :on-select-current-folder="onSelectCurrentFolder"
        :error="error"
        :has-more="hasMore"
        :is-loading-more="isLoadingMore"
        :load-more="loadMore"
    />
</template>
