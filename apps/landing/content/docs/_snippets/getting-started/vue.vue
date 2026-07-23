<script setup lang="ts">
import { UpupUploader } from '@upupjs/vue'
import '@upupjs/vue/styles'
</script>

<template>
    <UpupUploader provider="aws" upload-endpoint="/api/upload-token" />
</template>
