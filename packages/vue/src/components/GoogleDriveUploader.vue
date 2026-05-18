<script setup lang="ts">
import { useUploaderRuntime, useUploaderSource } from '../context/root-context'
import ClientGoogleDriveUploader from './ClientGoogleDriveUploader.vue'
import ServerModeDriveUploader from './ServerModeDriveUploader.vue'

const { mode } = useUploaderRuntime()
const { setActiveAdapter } = useUploaderSource()
</script>

<template>
    <ServerModeDriveUploader
        v-if="mode === 'server'"
        provider="google-drive"
        :on-back="() => setActiveAdapter(undefined)"
    />
    <ClientGoogleDriveUploader v-else />
</template>
