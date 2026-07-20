<script setup lang="ts">
import {
    useUploaderI18n,
    useUploaderTheme,
    useUploaderUploadControls,
} from '../../context/uploader-context'
import { isUploadActive, cn } from '@upupjs/core/internal'

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
    <template v-if="!!props.progress || isUploadActive(uploadStatus)">
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
                    'upup-relative upup-h-[6px] upup-flex-1 upup-overflow-hidden upup-rounded-[4px]',
                    dark ? 'upup-bg-white/[0.12]' : 'upup-bg-[#F5F5F5]',
                    props.progressBarClassName,
                    slotClasses.progressBar,
                    themeSlots?.progressBar?.track,
                )"
            >
                <div
                    :style="{ width: props.progress + '%' }"
                    :class="cn(
                        'upup-fx-progress-fill upup-fx-essential upup-h-full',
                        dark ? 'upup-bg-[#38bdf8]' : 'upup-bg-[#0ea5e9]',
                        slotClasses.progressBarInner,
                        themeSlots?.progressBar?.fill,
                    )"
                />
                <template v-if="isUploadActive(uploadStatus)">
                    <div
                        aria-hidden="true"
                        class="upup-animate-fx-sheen upup-pointer-events-none upup-absolute upup-inset-y-0 upup-left-0 upup-w-2/5"
                        :style="{
                            background:
                                'linear-gradient(90deg, transparent, rgba(255,255,255,0.45), transparent)',
                        }"
                    />
                </template>
            </div>
            <template v-if="!!props.showValue">
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
            </template>
        </div>
    </template>
</template>
