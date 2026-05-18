<script setup lang="ts">
import { computed, watch } from 'vue'
import type { Translations } from '@upup/core'
import {
    useUploaderEditor,
    useUploaderFiles,
    useUploaderI18n,
    useUploaderOptions,
    useUploaderTheme,
    useUploaderUploadControls,
} from '../context/root-context'
import { fileCanPreviewText, fileGetIsImage, fileGetIsPdf, fileGetIsText } from '@upup/core'
import { cn } from '@upup/core'
import FilePreviewThumbnail from './FilePreviewThumbnail.vue'
import ProgressBar from './shared/ProgressBar.vue'
import ShouldRender from './shared/ShouldRender.vue'

const props = defineProps<{
    fileName: string
    fileType: string
    fileId: string
    fileUrl: string
    fileSize?: number
    canPreview: boolean
    onRequestPreview?: () => void
}>()

const emit = defineEmits<{
    'update:canPreview': [value: boolean]
    click: []
}>()

const { handleFileRemove, files } = useUploaderFiles()
const { translations: tr } = useUploaderI18n()
const { openImageEditor } = useUploaderEditor()
const { upload: { filesProgressMap } } = useUploaderUploadControls()
const {
    icons: { FileDeleteIcon },
    allowPreview,
    imageEditor,
} = useUploaderOptions()
const {
    isDark: isDarkTheme,
    slotOverrides: slotClasses,
    slots: themeSlots,
} = useUploaderTheme()

const isImage = computed(() => fileGetIsImage(props.fileType))
const isPdf = computed(() => fileGetIsPdf(props.fileType, props.fileName))
const isText = computed(() => fileGetIsText(props.fileType, props.fileName))
const canPreviewText = computed(() =>
    fileCanPreviewText(props.fileType, props.fileName, props.fileSize),
)

const progress = computed(() =>
    Math.floor(
        (filesProgressMap[props.fileId]?.loaded /
            filesProgressMap[props.fileId]?.total) *
            100,
    ),
)

watch(
    [isImage, isPdf, isText, canPreviewText],
    () => {
        if (
            (isImage.value || isPdf.value || (isText.value && canPreviewText.value)) &&
            !props.canPreview
        ) {
            emit('update:canPreview', true)
        }
    },
    { immediate: true },
)

function onHandleFileRemove(e: MouseEvent) {
    e.stopPropagation()
    handleFileRemove(props.fileId)
}

function onHandleEditImage(e: MouseEvent) {
    e.stopPropagation()
    const file = files.get(props.fileId)
    if (file) openImageEditor(file)
}

function formatFileSize(bytes: number | undefined, tr: Translations) {
    if (!bytes || bytes === 0) return tr.zeroBytes
    const k = 1024
    const sizes = [tr.bytes, tr.kb, tr.mb, tr.gb]
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return Math.round((bytes / Math.pow(k, i)) * 10) / 10 + ' ' + sizes[i]
}

function updateCanPreview(val: boolean) {
    emit('update:canPreview', val)
}
</script>

<template>
    <div
        :class="cn('upup-inline-block', themeSlots?.filePreview?.root)"
        data-testid="upup-file-preview"
        data-upup-slot="file-preview"
        @click="emit('click')"
    >
        <div
            :class="cn(
                'upup-relative upup-h-[145px] upup-w-[145px] upup-overflow-hidden upup-rounded-lg upup-bg-white upup-shadow-sm',
                'upup-bg-contain upup-bg-center upup-bg-no-repeat',
                {
                    [slotClasses.fileThumbnailMultiple!]: slotClasses.fileThumbnailMultiple && files.size > 1,
                    [slotClasses.fileThumbnailSingle!]: slotClasses.fileThumbnailSingle && files.size === 1,
                },
                themeSlots?.filePreview?.thumbnail,
            )"
            :style="isImage ? { backgroundImage: `url(${fileUrl})` } : undefined"
        >
            <ShouldRender :if="!isImage">
                <div class="upup-flex upup-h-full upup-items-center upup-justify-center upup-p-6">
                    <FilePreviewThumbnail
                        :can-preview="canPreview"
                        :file-type="fileType"
                        :file-name="fileName"
                        :file-url="fileUrl"
                        :file-size="fileSize"
                        :allow-preview="allowPreview"
                        :slot-classes="slotClasses"
                        :labels="tr"
                        @update:can-preview="updateCanPreview"
                    />
                </div>
            </ShouldRender>

            <button
                v-if="isImage && imageEditor.enabled"
                :class="cn(
                    'upup-absolute upup-right-1.5 upup-top-8 upup-z-10',
                    'upup-flex upup-h-5 upup-w-5 upup-items-center upup-justify-center',
                    'upup-rounded-full upup-bg-white upup-text-blue-600 upup-shadow-sm',
                    'hover:upup-bg-white hover:upup-text-blue-700',
                    'upup-ring-1 upup-ring-black/5',
                    'disabled:upup-cursor-not-allowed disabled:upup-opacity-50',
                )"
                @click="onHandleEditImage"
                type="button"
                :disabled="!!progress"
                :aria-label="tr.editImage"
            >
                <svg
                    xmlns="http://www.w3.org/2000/svg"
                    viewBox="0 0 20 20"
                    fill="currentColor"
                    class="upup-h-3 upup-w-3"
                    aria-hidden="true"
                >
                    <path d="M2.695 14.763l-1.262 3.154a.5.5 0 00.65.65l3.155-1.262a4 4 0 001.343-.885L17.5 5.5a2.121 2.121 0 00-3-3L3.58 13.42a4 4 0 00-.885 1.343z" />
                </svg>
            </button>

            <button
                :class="cn(
                    'upup-absolute upup-right-1.5 upup-top-1.5 upup-z-10',
                    'upup-flex upup-h-5 upup-w-5 upup-items-center upup-justify-center',
                    'upup-rounded-full upup-bg-white upup-text-red-600 upup-shadow-sm',
                    'hover:upup-bg-white hover:upup-text-red-700',
                    'upup-ring-1 upup-ring-black/5',
                    'disabled:upup-cursor-not-allowed disabled:upup-opacity-50',
                    slotClasses.fileDeleteButton,
                    themeSlots?.filePreview?.deleteButton,
                )"
                @click="onHandleFileRemove"
                type="button"
                :disabled="!!progress"
                :aria-label="tr.removeFile"
                data-testid="upup-file-remove"
            >
                <component :is="FileDeleteIcon" class="upup-h-3 upup-w-3" />
            </button>

            <ProgressBar
                class="upup-absolute upup-bottom-0 upup-left-0 upup-right-0"
                progress-bar-class-name="upup-rounded-t-none upup-rounded-b-md"
                :progress="progress"
            />
        </div>

        <div class="upup-mt-1 upup-px-0.5">
            <div
                :class="cn(
                    'upup-truncate upup-text-[13px] upup-font-normal upup-leading-tight upup-text-gray-900',
                    { 'upup-text-white': isDarkTheme },
                    themeSlots?.filePreview?.name,
                )"
            >
                {{ fileName }}
            </div>
            <div
                :class="cn(
                    'upup-mt-0.5 upup-text-[11px] upup-leading-tight upup-text-gray-500',
                    { 'upup-text-gray-400': isDarkTheme },
                    themeSlots?.filePreview?.size,
                )"
            >
                {{ formatFileSize(fileSize, tr) }}
            </div>
            <button
                v-if="allowPreview && canPreview"
                type="button"
                :class="cn(
                    'upup-mt-1 upup-text-[11px] upup-font-normal upup-leading-tight upup-text-[#2563eb] upup-transition-all hover:upup-text-blue-700 hover:upup-underline',
                    { 'upup-text-[#4A9EFF] hover:upup-text-blue-300': isDarkTheme },
                    themeSlots?.filePreview?.previewButton,
                )"
                @click="onRequestPreview?.();"
            >
                {{ tr.clickToPreview }}
            </button>
        </div>
    </div>
</template>
