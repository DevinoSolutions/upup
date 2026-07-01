<script setup lang="ts">
import { useUploaderRuntime, useUploaderSource } from '../context/uploader-context'
import ClientDropboxUploader from './ClientDropboxUploader.vue'
import ServerModeDriveUploader from './ServerModeDriveUploader.vue'

const { mode } = useUploaderRuntime()
const { setActiveAdapter } = useUploaderSource()
</script>

<template>
    <ServerModeDriveUploader
        v-if="mode === 'server'"
        provider="dropbox"
        :on-back="() => setActiveAdapter(undefined)"
    />
    <ClientDropboxUploader v-else />
</template>
