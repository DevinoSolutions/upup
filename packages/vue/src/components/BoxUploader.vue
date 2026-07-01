<script setup lang="ts">
import { useUploaderRuntime, useUploaderSource } from '../context/uploader-context'
import ClientBoxUploader from './ClientBoxUploader.vue'
import ServerModeDriveUploader from './ServerModeDriveUploader.vue'

const { mode } = useUploaderRuntime()
const { setActiveAdapter } = useUploaderSource()
</script>

<template>
    <ServerModeDriveUploader
        v-if="mode === 'server'"
        provider="box"
        :on-back="() => setActiveAdapter(undefined)"
    />
    <ClientBoxUploader v-else />
</template>
