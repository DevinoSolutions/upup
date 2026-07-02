<script setup lang="ts">
import { useUploaderRuntime, useUploaderSource } from '../context/uploader-context'
import ClientOneDriveUploader from './ClientOneDriveUploader.vue'
import ServerModeDriveUploader from './ServerModeDriveUploader.vue'

const { mode } = useUploaderRuntime()
const { setActiveSource } = useUploaderSource()
</script>

<template>
    <ServerModeDriveUploader
        v-if="mode === 'server'"
        provider="onedrive"
        :on-back="() => setActiveSource(undefined)"
    />
    <ClientOneDriveUploader v-else />
</template>
