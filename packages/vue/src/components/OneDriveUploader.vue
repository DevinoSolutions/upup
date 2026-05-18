<script setup lang="ts">
import { useUploaderRuntime, useUploaderSource } from '../context/root-context'
import ClientOneDriveUploader from './ClientOneDriveUploader.vue'
import ServerModeDriveUploader from './ServerModeDriveUploader.vue'

const { mode } = useUploaderRuntime()
const { setActiveAdapter } = useUploaderSource()
</script>

<template>
    <ServerModeDriveUploader
        v-if="mode === 'server'"
        provider="onedrive"
        :on-back="() => setActiveAdapter(undefined)"
    />
    <ClientOneDriveUploader v-else />
</template>
