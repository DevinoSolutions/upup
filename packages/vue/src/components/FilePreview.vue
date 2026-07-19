<script setup lang="ts">
import { computed, watch } from 'vue'
import { UploadStatus, type Translations } from '@upupjs/core'
import {
    useUploaderFiles,
    useUploaderI18n,
    useUploaderOptions,
    useUploaderTheme,
    useUploaderUploadControls,
} from '../context/uploader-context'
import {
    fileCanPreviewText,
    fileGetIsImage,
    fileGetIsPdf,
    fileGetIsText,
} from '@upupjs/core/internal'
import { cn } from '@upupjs/core/internal'
import FilePreviewThumbnail from './FilePreviewThumbnail.vue'
import ProgressBar from './shared/ProgressBar.vue'
import FileSuccessCheck from './shared/FileSuccessCheck.vue'

const props = withDefaults(
    defineProps<{
        fileName: string
        fileType: string
        fileId: string
        fileUrl: string
        fileSize?: number
        canPreview: boolean
        onRequestPreview?: () => void
        /** Position in the sorted list — drives the completion-check stagger. */
        index?: number
    }>(),
    { index: 0 },
)

const emit = defineEmits<{
    'update:canPreview': [value: boolean]
    click: []
}>()

const { handleFileRemove, files } = useUploaderFiles()
const { translations: tr } = useUploaderI18n()
const {
    upload: { filesProgressMap },
} = useUploaderUploadControls()
const {
    icons: { FileDeleteIcon },
    allowPreview,
} = useUploaderOptions()
const {
    isDark: isDarkTheme,
    slotOverrides: slotClasses,
    slots: themeSlots,
} = useUploaderTheme()

const isImage = computed(() => fileGetIsImage(props.fileType))
const isVideo = computed(() => props.fileType.startsWith('video/'))
const isPdf = computed(() => fileGetIsPdf(props.fileType, props.fileName))
const isText = computed(() => fileGetIsText(props.fileType, props.fileName))
const canPreviewText = computed(() =>
    fileCanPreviewText(props.fileType, props.fileName, props.fileSize),
)

const progress = computed(() => {
    const fileProgress = filesProgressMap.value[props.fileId]
    const loaded = fileProgress?.loaded ?? NaN
    const total = fileProgress?.total ?? NaN
    const pct = Math.floor((loaded / total) * 100)
    // No progress entry ⇒ NaN; total === 0 ⇒ Infinity. Either would render
    // width:NaN%/aria-valuenow=NaN in ProgressBar while an upload is active.
    return Number.isFinite(pct) ? pct : 0
})

const isSuccessful = computed(
    () => files.value.get(props.fileId)?.status === UploadStatus.SUCCESSFUL,
)

watch(
    [isImage, isPdf, isText, canPreviewText],
    () => {
        if (
            (isImage.value ||
                isPdf.value ||
                (isText.value && canPreviewText.value)) &&
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

function formatFileSize(bytes: number | undefined, t: Translations) {
    if (!bytes || bytes === 0) return t.zeroBytes
    const k = 1024
    const sizes = [t.bytes, t.kb, t.mb, t.gb]
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return Math.round((bytes / Math.pow(k, i)) * 10) / 10 + ' ' + sizes[i]
}

function updateCanPreview(val: boolean) {
    emit('update:canPreview', val)
}
</script>

<template>
    <div
        :class="cn('upup-block upup-w-full', themeSlots?.filePreview?.root)"
        data-testid="upup-file-preview"
        data-upup-slot="file-preview"
    >
        <div
            :class="
                cn(
                    'upup-fx-hover-lift upup-relative upup-h-[160px] upup-w-full upup-overflow-hidden upup-rounded-xl upup-ring-1',
                    'upup-bg-contain upup-bg-center upup-bg-no-repeat',
                    isDarkTheme
                        ? 'upup-bg-white/[0.055] upup-ring-white/[0.08]'
                        : 'upup-bg-black/[0.04] upup-ring-black/[0.06]',
                    {
                        [slotClasses.fileThumbnailMultiple ?? '']:
                            slotClasses.fileThumbnailMultiple && files.size > 1,
                        [slotClasses.fileThumbnailSingle ?? '']:
                            slotClasses.fileThumbnailSingle && files.size === 1,
                    },
                    themeSlots?.filePreview?.thumbnail,
                )
            "
            :style="isImage ? { backgroundImage: `url(${fileUrl})` } : undefined"
        >
            <button
                type="button"
                :aria-label="fileName"
                class="upup-absolute upup-inset-0 upup-z-0 upup-cursor-pointer"
                @click="emit('click')"
            ></button>
            <!-- First-frame video thumbnail — no controls chrome (the native
                 player pill read as broken CSS in a 145px tile). -->
            <video
                v-if="isVideo"
                :src="fileUrl"
                muted
                playsinline
                preload="metadata"
                class="upup-pointer-events-none upup-absolute upup-inset-0 upup-h-full upup-w-full upup-object-cover"
            />
            <div
                v-if="!isImage && !isVideo"
                class="upup-flex upup-h-full upup-items-center upup-justify-center upup-p-6"
            >
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

            <!-- Delete disappears once the file has uploaded successfully — the
                 completion check is then the only overlay affordance. -->
            <button
                v-if="!isSuccessful"
                :class="
                    cn(
                        'upup-fx-remove upup-fx-press upup-absolute upup-right-1.5 upup-top-1.5 upup-z-10',
                        'upup-flex upup-h-[30px] upup-w-[30px] upup-items-center upup-justify-center',
                        'upup-rounded-[8px] upup-bg-[#04080f]/40 upup-text-[#e2e8f0]',
                        'hover:upup-bg-[#04080f]/65',
                        'disabled:upup-cursor-not-allowed disabled:upup-opacity-50',
                        slotClasses.fileDeleteButton,
                        themeSlots?.filePreview?.deleteButton,
                    )
                "
                @click="onHandleFileRemove"
                type="button"
                :disabled="!!progress"
                :aria-label="tr.removeFile"
                data-testid="upup-file-remove"
            >
                <component :is="FileDeleteIcon" class="upup-h-5 upup-w-5" />
            </button>

            <FileSuccessCheck
                v-if="isSuccessful"
                :index="index ?? 0"
                :size="20"
                class="upup-absolute upup-left-1.5 upup-top-1.5 upup-z-10"
            />

            <ProgressBar
                class="upup-absolute upup-bottom-0 upup-left-0 upup-right-0"
                progress-bar-class-name="upup-rounded-t-none upup-rounded-b-md"
                :progress="progress"
            />
        </div>

        <div class="upup-mt-1 upup-px-0.5">
            <div
                :class="
                    cn(
                        'upup-truncate upup-text-[13px] upup-font-normal upup-leading-tight upup-text-gray-900',
                        { 'upup-text-white': isDarkTheme },
                        themeSlots?.filePreview?.name,
                    )
                "
            >
                {{ fileName }}
            </div>
            <div
                :class="
                    cn(
                        'upup-mt-0.5 upup-text-[11px] upup-leading-tight upup-text-gray-500',
                        { 'upup-text-gray-400': isDarkTheme },
                        themeSlots?.filePreview?.size,
                    )
                "
            >
                {{ formatFileSize(fileSize, tr) }}
            </div>
            <button
                v-if="allowPreview && canPreview"
                type="button"
                :class="
                    cn(
                        'upup-mt-1 upup-text-[11px] upup-font-normal upup-leading-tight upup-text-[#0284c7] upup-transition-all hover:upup-text-[#0284c7] hover:upup-underline',
                        {
                            'upup-text-[#38bdf8] hover:upup-text-[#7dd3fc]':
                                isDarkTheme,
                        },
                        themeSlots?.filePreview?.previewButton,
                    )
                "
                @click="onRequestPreview?.()"
            >
                {{ tr.clickToPreview }}
            </button>
        </div>
    </div>
</template>
