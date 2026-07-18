<script setup lang="ts">
import { computed } from 'vue'
import { cn } from '@upupjs/core/internal'
import { UploadStatus, type UploadFile, type Translations } from '@upupjs/core'
import { fileGetIsImage } from '@upupjs/core/internal'
import {
    useUploaderFiles,
    useUploaderI18n,
    useUploaderOptions,
    useUploaderTheme,
    useUploaderUploadControls,
} from '../context/uploader-context'
import ProgressBar from './shared/ProgressBar.vue'
import FileSuccessCheck from './shared/FileSuccessCheck.vue'

/**
 * Compact list-mode row (spec §4 state 3, states-tour-v2.html "multiple files").
 * A horizontal card: thumbnail · name/size · remove. The grid-mode tile
 * (FilePreview) keeps the richer affordances (edit, click-to-preview); the row
 * is the dense overview and matches the mockup exactly.
 */
const props = withDefaults(
    defineProps<{
        file: UploadFile
        /** Position in the sorted list — drives the completion-check stagger. */
        index?: number
    }>(),
    { index: 0 },
)

const { handleFileRemove } = useUploaderFiles()
const { translations: tr } = useUploaderI18n()
const {
    icons: { FileDeleteIcon },
} = useUploaderOptions()
const { isDark: dark } = useUploaderTheme()
const {
    upload: { filesProgressMap },
} = useUploaderUploadControls()

const isImage = computed(() => fileGetIsImage(props.file.type ?? ''))
const progress = computed(() => {
    const p = filesProgressMap.value[props.file.id]
    const loaded = p?.loaded ?? NaN
    const total = p?.total ?? NaN
    const pct = Math.floor((loaded / total) * 100)
    // No progress entry ⇒ NaN; total === 0 ⇒ Infinity. Either would render
    // width:NaN%/aria-valuenow=NaN in ProgressBar while an upload is active.
    return Number.isFinite(pct) ? pct : 0
})

const rowStyle = computed(() =>
    isImage.value
        ? { backgroundImage: `url(${props.file.url ?? ''})` }
        : { background: 'linear-gradient(135deg,#0ea5e9,#7c3aed)' },
)

function formatFileSize(bytes: number | undefined, t: Translations): string {
    if (!bytes || bytes === 0) return t.zeroBytes
    const k = 1024
    const sizes = [t.bytes, t.kb, t.mb, t.gb]
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return Math.round((bytes / Math.pow(k, i)) * 10) / 10 + ' ' + sizes[i]
}

function onRemove(e: MouseEvent) {
    e.stopPropagation()
    handleFileRemove(props.file.id)
}
</script>

<template>
    <div
        :class="cn(
            'upup-fx-hover-lift upup-flex upup-items-center upup-gap-3 upup-rounded-xl upup-px-3 upup-py-2.5 upup-ring-1',
            dark
                ? 'upup-bg-white/[0.04] upup-ring-white/[0.07]'
                : 'upup-bg-black/[0.04] upup-ring-black/[0.06]',
        )"
    >
        <div
            class="upup-flex upup-h-10 upup-w-10 upup-flex-none upup-items-center upup-justify-center upup-overflow-hidden upup-rounded-[9px] upup-bg-center upup-bg-cover upup-bg-no-repeat"
            :style="rowStyle"
        >
            <svg
                v-if="!isImage"
                viewBox="0 0 24 24"
                width="18"
                height="18"
                fill="none"
                stroke="rgba(255,255,255,0.9)"
                stroke-width="1.6"
                stroke-linecap="round"
                stroke-linejoin="round"
                aria-hidden="true"
            >
                <path d="M6 3h8l4 4v13a1 1 0 0 1-1 1H6a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1z" />
                <path d="M14 3v4h4" />
            </svg>
        </div>

        <div class="upup-flex upup-min-w-0 upup-flex-1 upup-flex-col upup-gap-0.5">
            <div
                :class="cn(
                    'upup-truncate upup-text-[13px]',
                    dark ? 'upup-text-[#e2e8f0]' : 'upup-text-gray-900',
                )"
            >
                {{ file.name }}
            </div>
            <div
                :class="cn(
                    'upup-text-[12px]',
                    dark ? 'upup-text-[#94a3b8]' : 'upup-text-gray-500',
                )"
            >
                {{ formatFileSize(file.size, tr) }}
            </div>
            <ProgressBar
                v-if="!!progress"
                class="upup-mt-1"
                progress-bar-class-name="upup-rounded"
                :progress="progress"
                :show-value="true"
            />
        </div>

        <FileSuccessCheck
            v-if="file.status === UploadStatus.SUCCESSFUL"
            :index="index ?? 0"
            :size="20"
            class="upup-flex-none"
        />

        <button
            :class="cn(
                'upup-fx-remove upup-fx-press upup-flex upup-h-[26px] upup-w-[26px] upup-flex-none upup-items-center upup-justify-center upup-rounded-[7px]',
                dark
                    ? 'upup-text-[#64748b] hover:upup-bg-white/[0.06]'
                    : 'upup-text-gray-500 hover:upup-bg-black/[0.06]',
                'disabled:upup-cursor-not-allowed disabled:upup-opacity-50',
            )"
            @click="onRemove"
            type="button"
            :disabled="!!progress"
            :aria-label="tr.removeFile"
            data-testid="upup-file-remove"
        >
            <component :is="FileDeleteIcon" class="upup-h-[15px] upup-w-[15px]" />
        </button>
    </div>
</template>
