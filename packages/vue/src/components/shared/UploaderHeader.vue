<script setup lang="ts">
import { computed } from 'vue'
import { formatUiMessage as t, pluralUiMessage as plural } from '@upupjs/core'
import { isUploadActive, cn } from '@upupjs/core/internal'
import {
    useUploaderFiles,
    useUploaderI18n,
    useUploaderOptions,
    useUploaderTheme,
    useUploaderUploadControls,
    useUploaderView,
} from '../../context/uploader-context'
import Icon from '../Icon'

const props = defineProps<{
    handleCancel: () => void
}>()

const { files } = useUploaderFiles()
const { setIsAddingMore, isAddingMore, viewMode, setViewMode } = useUploaderView()
const { translations: tr } = useUploaderI18n()
const {
    mini,
    limit,
    isProcessing,
    icons: { ContainerAddMoreIcon },
} = useUploaderOptions()
const { isDark: dark, slotOverrides: slotClasses } = useUploaderTheme()
const { upload: { uploadStatus } } = useUploaderUploadControls()
const isUploading = computed(() => isUploadActive(uploadStatus.value))
const isLimitReached = computed(() => limit === files.value.size)
const cancelText = computed(() =>
    isAddingMore.value ? tr.cancel : tr.removeAllFiles,
)

function toggleViewMode() {
    setViewMode(viewMode.value === 'grid' ? 'list' : 'grid')
}
</script>

<template>
    <template v-if="!mini">
        <div
            data-testid="upup-header"
            data-upup-slot="header"
            :class="cn(
                'upup-shadow-bottom upup-left-0 upup-right-0 upup-top-0 upup-z-10 upup-grid upup-grid-cols-4 upup-grid-rows-2 upup-items-center upup-justify-between upup-rounded-t-lg upup-bg-black/[0.025] upup-px-3 upup-py-2 md:upup-grid-rows-1',
                { 'upup-bg-white/5 dark:upup-bg-white/5': dark },
                slotClasses.containerHeader,
            )"
        >
            <button
                :class="cn(
                    'upup-max-md upup-col-start-1 upup-col-end-3 upup-row-start-2 upup-p-1 upup-text-left upup-text-sm upup-text-[#0284c7] md:upup-col-end-2 md:upup-row-start-1',
                    { 'upup-text-[#38bdf8] dark:upup-text-[#38bdf8]': dark },
                    slotClasses.containerCancelButton,
                )"
                @click="props.handleCancel"
                :disabled="isUploading || isProcessing"
            >
                {{ cancelText }}
            </button>
            <span
                :class="cn(
                    'upup-col-span-4 upup-text-center upup-text-sm upup-text-[#6D6D6D] md:upup-col-span-2',
                    { 'upup-text-gray-300 dark:upup-text-gray-300': dark },
                )"
            >
                <template v-if="isAddingMore">
                    {{ tr.addingMoreFiles }}
                </template>
                <template v-if="!isAddingMore">
                    {{ t(plural(tr, 'filesSelected', files.size), { count: files.size }) }}
                </template>
            </span>
            <div class="upup-col-start-3 upup-col-end-5 upup-flex upup-items-center upup-justify-end upup-gap-2 md:upup-col-start-4">
                <template v-if="files.size > 1">
                    <button
                        :class="cn(
                            'upup-flex upup-h-7 upup-w-7 upup-items-center upup-justify-center upup-rounded upup-text-gray-500 upup-transition-colors hover:upup-bg-black/10',
                            { 'upup-text-gray-300 hover:upup-bg-white/10': dark },
                        )"
                        @click="toggleViewMode"
                        :title="viewMode === 'grid' ? tr.switchToListView : tr.switchToGridView"
                    >
                        <Icon v-if="viewMode === 'grid'" name="layout-list" :size="16" />
                        <Icon v-else name="layout-grid" :size="16" />
                    </button>
                </template>
                <template v-if="!isAddingMore && limit > 1 && !isLimitReached">
                    <button
                        :class="cn(
                            'upup-flex upup-items-center upup-gap-1 upup-rounded-md upup-border upup-border-dashed upup-border-[#38bdf8]/50 upup-px-2 upup-py-1 upup-text-sm upup-text-[#0284c7]',
                            { 'upup-text-[#38bdf8] dark:upup-text-[#38bdf8]': dark },
                            slotClasses.containerAddMoreButton,
                        )"
                        @click="setIsAddingMore(true)"
                        :disabled="isUploading || isProcessing"
                    >
                        <component :is="ContainerAddMoreIcon" /> {{ tr.addMore }}
                    </button>
                </template>
            </div>
        </div>
    </template>
</template>
