<script setup lang="ts">
import {
    useUploaderI18n,
    useUploaderTheme,
    useUploaderUploadControls,
} from '../../context/root-context'
import { isUploadActive } from '../../lib/status-helpers'
import { cn } from '../../lib/tailwind'
import ShouldRender from './ShouldRender.vue'

const props = withDefaults(
    defineProps<{
        progress: number
        showValue?: boolean
        progressBarClassName?: string
        class?: string
    }>(),
    { showValue: false },
)

const { isDark: dark, slotOverrides: slotClasses, slots: themeSlots } = useUploaderTheme()
const { translations: tr } = useUploaderI18n()
const { upload: { uploadStatus } } = useUploaderUploadControls()
</script>

<template>
    <ShouldRender :if="!!props.progress || isUploadActive(uploadStatus)">
        <div
            data-testid="upup-progress-bar"
            data-upup-slot="progress-bar"
            role="progressbar"
            :aria-valuenow="props.progress"
            :aria-valuemin="0"
            :aria-valuemax="100"
            :aria-label="tr.uploadProgress"
            :class="cn(
                'upup-flex upup-items-center upup-gap-2',
                props.class,
                slotClasses.progressBarContainer,
                themeSlots?.progressBar?.root,
            )"
        >
            <div
                :class="cn(
                    'upup-h-[6px] upup-flex-1 upup-overflow-hidden upup-rounded-[4px] upup-bg-[#F5F5F5]',
                    props.progressBarClassName,
                    slotClasses.progressBar,
                    themeSlots?.progressBar?.track,
                )"
            >
                <div
                    :style="{ width: props.progress + '%' }"
                    :class="cn(
                        'upup-h-full upup-bg-[#8EA5E7]',
                        slotClasses.progressBarInner,
                        themeSlots?.progressBar?.fill,
                    )"
                />
            </div>
            <ShouldRender :if="!!props.showValue">
                <p
                    :class="cn(
                        'upup-text-xs upup-font-semibold',
                        { 'upup-text-white': dark },
                        slotClasses.progressBarText,
                        themeSlots?.progressBar?.text,
                    )"
                >
                    {{ props.progress }}%
                </p>
            </ShouldRender>
        </div>
    </ShouldRender>
</template>
