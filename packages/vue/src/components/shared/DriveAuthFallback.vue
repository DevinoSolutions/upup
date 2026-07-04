<script setup lang="ts">
import { type DriveBrowserError, formatUiMessage as t, cn } from '@upup/core'
import { useUploaderI18n, useUploaderTheme } from '../../context/uploader-context'
import SourceViewContainer from './SourceViewContainer.vue'

const props = withDefaults(defineProps<{
    providerName: string
    onRetry: () => void
    error?: DriveBrowserError
    dataUpupSlot?: string
}>(), {
    dataUpupSlot: 'drive-auth-fallback',
})

const { isDark: dark, slotOverrides: slotClasses } = useUploaderTheme()
const { translations: tr } = useUploaderI18n()
</script>

<template>
    <SourceViewContainer :data-upup-slot="props.dataUpupSlot">
        <div class="upup-flex upup-h-full upup-w-full upup-flex-col upup-items-center upup-justify-center upup-gap-4 upup-p-6 upup-text-center">
            <p
                v-if="!!props.error"
                data-testid="upup-drive-error"
                data-upup-slot="drive-error"
                role="alert"
                class="upup-p-4 upup-text-sm upup-text-red-600 dark:upup-text-red-400"
            >
                {{ t(tr.driveLoadError, { message: props.error.message }) }}
            </p>
            <p
                :class="cn(
                    'upup-text-sm upup-text-[#333]',
                    {
                        'upup-text-[#FAFAFA] dark:upup-text-[#FAFAFA]': dark,
                    },
                    slotClasses.sourceView,
                )"
            >
                {{ t(tr.authenticatePrompt, { provider: props.providerName }) }}
            </p>
            <button
                type="button"
                :class="cn(
                    'upup-rounded-md upup-bg-blue-600 upup-px-4 upup-py-2 upup-text-sm upup-font-medium upup-text-white upup-transition-all upup-duration-300 hover:upup-bg-blue-700',
                    {
                        'upup-bg-[#30C5F7] hover:upup-bg-[#1eb4e6] dark:upup-bg-[#30C5F7] dark:hover:upup-bg-[#1eb4e6]': dark,
                    },
                )"
                @click="props.onRetry"
            >
                {{ t(tr.signInWith, { provider: props.providerName }) }}
            </button>
        </div>
    </SourceViewContainer>
</template>
