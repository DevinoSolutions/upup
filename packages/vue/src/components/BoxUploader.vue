<script setup lang="ts">
import { useUploaderRuntime, useUploaderSource } from '../context/uploader-context'
import ClientBoxUploader from './ClientBoxUploader.vue'
import ServerModeDriveUploader from './ServerModeDriveUploader.vue'

const { mode } = useUploaderRuntime()
const { setActiveSource } = useUploaderSource()
</script>

<template>
    <ServerModeDriveUploader
        v-if="mode === 'server'"
        provider="box"
        :on-back="() => setActiveSource(undefined)"
    />
    <ClientBoxUploader v-else />
</template>
