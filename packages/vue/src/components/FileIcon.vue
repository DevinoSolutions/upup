<script setup lang="ts">
import { computed } from 'vue'
import { useUploaderTheme } from '../context/root-context'
import { cn, fileTypeIconName } from '@upup/core'
import Icon from './Icon'

const props = withDefaults(
    defineProps<{
        extension?: string
        class?: string
    }>(),
    { extension: '' },
)

const { isDark: dark } = useUploaderTheme()

const iconName = computed(() => fileTypeIconName(props.extension))
const iconClass = computed(() =>
    cn('upup-text-5xl upup-text-blue-600', props.class, {
        'upup-text-[#59D1F9] dark:upup-text-[#59D1F9]': dark,
    }),
)
</script>

<template>
    <span class="upup-inline-flex" data-testid="upup-file-icon" data-upup-slot="file-icon">
        <Icon :name="iconName" :class="iconClass" />
    </span>
</template>
