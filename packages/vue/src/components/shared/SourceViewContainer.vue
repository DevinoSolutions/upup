<script setup lang="ts">
import { useUploaderTheme } from '../../context/uploader-context'
import { cn } from '@upup/core'

withDefaults(defineProps<{ isLoading?: boolean }>(), { isLoading: false })

const { isDark: dark, slotOverrides: slotClasses } = useUploaderTheme()
</script>

<template>
    <div
        data-testid="upup-adapter-view"
        :class="cn(
            'upup-flex upup-items-center upup-justify-center upup-overflow-hidden upup-bg-black/[0.075]',
            {
                'upup-bg-white/10 upup-text-[#FAFAFA] dark:upup-bg-white/10 dark:upup-text-[#FAFAFA]': isLoading && dark,
                [slotClasses.sourceView!]: !isLoading && !!slotClasses.sourceView,
                [slotClasses.driveLoading!]: isLoading && !!slotClasses.driveLoading,
            },
        )"
        v-bind="$attrs"
    >
        <slot />
    </div>
</template>
