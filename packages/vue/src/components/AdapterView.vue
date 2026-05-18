<script setup lang="ts">
import { computed, Suspense } from 'vue'
import {
    useUploaderI18n,
    useUploaderOptions,
    useUploaderRuntime,
    useUploaderSource,
    useUploaderTheme,
} from '../context/root-context'
import { uploadSourceObject } from '../lib/constants'
import { cn } from '../lib/tailwind'
import DefaultLoaderIcon from './DefaultLoaderIcon.vue'

const { core } = useUploaderRuntime()
const { activeAdapter, setActiveAdapter } = useUploaderSource()
const { translations: tr } = useUploaderI18n()
const { mini } = useUploaderOptions()
const { isDark: dark, slotOverrides: slotClasses } = useUploaderTheme()

const uploadComponent = computed(
    () => activeAdapter && uploadSourceObject[activeAdapter]?.Component,
)
const adapterIcon = computed(
    () => activeAdapter && uploadSourceObject[activeAdapter]?.Icon,
)

const shouldRender = computed(
    () => !!uploadComponent.value && !mini && !!activeAdapter && !!adapterIcon.value,
)

function handleCancel() {
    core?.emit('source-view-cancel', { sourceId: activeAdapter })
    setActiveAdapter(undefined)
}
</script>

<template>
    <div
        v-if="shouldRender"
        class="upup-grid upup-h-full upup-w-full upup-grid-rows-[auto,1fr]"
        data-upup-slot="adapter-view"
    >
        <div
            :class="cn(
                'upup-shadow-bottom upup-flex upup-items-center upup-justify-between upup-bg-black/[0.025] upup-px-3 upup-py-2 upup-text-sm upup-font-medium upup-text-[#1b5dab]',
                {
                    'upup-bg-white/5 upup-text-[#FAFAFA] dark:upup-bg-white/5 dark:upup-text-[#FAFAFA]': dark,
                },
                slotClasses.adapterViewHeader,
            )"
        >
            <component :is="adapterIcon!" />
            <button
                :class="cn(
                    'upup-rounded-md upup-p-1 upup-text-blue-600 upup-transition-all upup-duration-300',
                    { 'upup-text-[#30C5F7] dark:upup-text-[#30C5F7]': dark },
                    slotClasses.adapterViewCancelButton,
                )"
                @click="handleCancel"
                type="button"
            >
                {{ tr.cancel }}
            </button>
        </div>
        <Suspense>
            <component :is="uploadComponent!" />
            <template #fallback>
                <div class="upup-flex upup-h-full upup-items-center upup-justify-center">
                    <DefaultLoaderIcon />
                </div>
            </template>
        </Suspense>
    </div>
</template>
