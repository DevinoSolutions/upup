<script setup lang="ts">
import useGoogleDrive from '../composables/useGoogleDrive'
import DriveAuthFallback from './shared/DriveAuthFallback.vue'
import DriveBrowser from './shared/DriveBrowser.vue'

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
    downloadProgress,
    handleCancelDownload,
    onSelectCurrentFolder,
} = useGoogleDrive()
</script>

<template>
    <DriveAuthFallback
        v-if="!token && (authCancelled || isAuthReady)"
        provider-name="Google Drive"
        :on-retry="retryAuth"
        data-upup-slot="google-drive-uploader"
    />
    <DriveBrowser
        v-else
        :drive-files="driveFiles"
        :user="user"
        :handle-sign-out="handleSignOut"
        data-upup-slot="google-drive-uploader"
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
