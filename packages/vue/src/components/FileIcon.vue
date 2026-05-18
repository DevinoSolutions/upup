<script setup lang="ts">
import { computed } from 'vue'
import { useUploaderTheme } from '../context/root-context'
import { cn } from '../lib/tailwind'
import { FileIconSvg } from './Icons'

const props = withDefaults(
    defineProps<{
        extension?: string
        class?: string
    }>(),
    { extension: '' },
)

const { isDark: dark } = useUploaderTheme()

// Since Vue doesn't have the react-icons TbFileType* components,
// we use a generic file icon with the extension label
const iconClass = computed(() =>
    cn('upup-text-5xl upup-text-blue-600', props.class, {
        'upup-text-[#59D1F9] dark:upup-text-[#59D1F9]': dark,
    }),
)
</script>

<template>
    <div class="upup-flex upup-flex-col upup-items-center upup-gap-0.5">
        <FileIconSvg :class="iconClass" />
        <span
            v-if="extension"
            class="upup-text-[10px] upup-font-medium upup-uppercase upup-text-gray-500"
        >
            {{ extension }}
        </span>
    </div>
</template>
