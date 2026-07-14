<script setup lang="ts">
import { useUploaderRuntime, useUploaderSource } from '../context/uploader-context'
import ClientGoogleDriveUploader from './ClientGoogleDriveUploader.vue'
import ServerModeDriveUploader from './ServerModeDriveUploader.vue'

const { mode } = useUploaderRuntime()
const { setActiveSource } = useUploaderSource()
</script>

<template>
    <ServerModeDriveUploader
        v-if="mode === 'server'"
        provider="google-drive"
        :on-back="() => setActiveSource(undefined)"
    />
    <ClientGoogleDriveUploader v-else />
</template>
