<script setup lang="ts">
import { useBox } from '../composables/useBox'
import DriveAuthFallback from './shared/DriveAuthFallback.vue'
import DriveBrowser from './shared/DriveBrowser.vue'

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

<template>
    <DriveAuthFallback
        v-if="!isAuthenticated && !token && !isLoading"
        provider-name="Box"
        :on-retry="authenticate"
        data-upup-slot="box-uploader"
    />
    <DriveBrowser
        v-else
        :drive-files="driveFiles"
        :user="user"
        :handle-sign-out="handleSignOut"
        data-upup-slot="box-uploader"
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
