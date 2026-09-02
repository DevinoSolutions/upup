<script setup lang="ts">
import { UpupUploader } from '@useupup/vue'
import '@useupup/vue/styles'
</script>

<template>
    <UpupUploader provider="aws" upload-endpoint="/api/upload-token" />
</template>
