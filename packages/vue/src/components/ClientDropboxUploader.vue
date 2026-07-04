<script setup lang="ts">
import { useDropbox } from '../composables/useDropbox'
import DriveAuthFallback from './shared/DriveAuthFallback.vue'
import DriveBrowser from './shared/DriveBrowser.vue'

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
} = useDropbox()

async function handleSignOut() {
    logout()
}
</script>

<template>
    <DriveAuthFallback
        v-if="!isAuthenticated && !token && !isLoading"
        provider-name="Dropbox"
        :on-retry="authenticate"
        data-upup-slot="dropbox-uploader"
    />
    <DriveBrowser
        v-else
        :drive-files="driveFiles"
        :user="user"
        :handle-sign-out="handleSignOut"
        data-upup-slot="dropbox-uploader"
        :path="path"
        :set-path="setPath"
        :is-click-loading="isClickLoading"
        :handle-click="handleClick"
        :selected-files="selectedFiles"
        :show-loader="showLoader"
        :handle-submit="handleSubmit"
        :handle-cancel-download="handleCancelDownload"
        :on-select-current-folder="onSelectCurrentFolder"
    />
</template>
