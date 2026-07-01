<script setup lang="ts">
import { useUploaderOptions } from '../../context/uploader-context'

defineProps<{
    if: boolean
    isLoading?: boolean
}>()

const { icons } = useUploaderOptions()
</script>

<template>
    <component :is="icons.LoaderIcon" v-if="isLoading" />
    <template v-else-if="$props.if">
        <slot />
    </template>
</template>
