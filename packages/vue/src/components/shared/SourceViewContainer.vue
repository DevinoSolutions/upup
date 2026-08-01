<script setup lang="ts">
import { useUploaderTheme } from '../../context/uploader-context'
import { cn } from '@upupjs/core/internal'

withDefaults(defineProps<{ isLoading?: boolean }>(), { isLoading: false })

const { isDark: dark, slotOverrides: slotClasses } = useUploaderTheme()
</script>

<template>
    <div
        data-testid="upup-source-view"
        :class="
            cn(
                // Transparent by design: the view body sits directly on the
                // panel's gradient chrome (the old black/[0.075] wash read as
                // a mismatched gray block over the light gradient).
                'upup-flex upup-items-center upup-justify-center upup-overflow-hidden',
                {
                    'upup-text-[#FAFAFA] dark:upup-text-[#FAFAFA]':
                        isLoading && dark,
                    [slotClasses.sourceView ?? '']:
                        !isLoading && !!slotClasses.sourceView,
                    [slotClasses.driveLoading ?? '']:
                        isLoading && !!slotClasses.driveLoading,
                },
            )
        "
        v-bind="$attrs"
    >
        <slot />
    </div>
</template>
