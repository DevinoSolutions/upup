<script setup lang="ts">
import { computed } from 'vue'
import { cn } from '@upupjs/core/internal'
import {
    UploadStatus,
    fileTypeIconName,
    type IconName,
    type UploadFile,
    type Translations,
} from '@upupjs/core'
import { fileGetExtension, fileGetIsImage } from '@upupjs/core/internal'
import {
    useUploaderFiles,
    useUploaderI18n,
    useUploaderOptions,
    useUploaderTheme,
    useUploaderUploadControls,
} from '../context/uploader-context'
import Icon from './Icon'
import ProgressBar from './shared/ProgressBar.vue'
import FileSuccessCheck from './shared/FileSuccessCheck.vue'

const ARCHIVE_EXTENSIONS = new Set(['zip', 'rar', '7z', 'tar', 'gz', 'bz2', 'xz'])

/**
 * Per-category thumbnail treatment for non-media rows so pdf / archive / audio /
 * generic no longer all read as the same blue doc: a distinct gradient tint plus
 * the type-specific glyph (audio uses the waveform icon; the rest use the
 * file-<ext> registry icon, falling back to the generic file glyph).
 */
function nonMediaThumb(
    type: string,
    name: string,
): { gradient: string; icon: IconName } {
    const ext = fileGetExtension(type, name)
    if (type.startsWith('audio/'))
        return {
            gradient: 'linear-gradient(135deg,#a855f7,#6366f1)',
            icon: 'audio',
        }
    if (ext === 'pdf' || type === 'application/pdf')
        return {
            gradient: 'linear-gradient(135deg,#f43f5e,#ec4899)',
            icon: 'file-pdf',
        }
    if (ARCHIVE_EXTENSIONS.has(ext) || type.includes('zip'))
        return {
            gradient: 'linear-gradient(135deg,#f59e0b,#f97316)',
            icon: fileTypeIconName(ext === 'zip' ? 'zip' : ext),
        }
    return {
        gradient: 'linear-gradient(135deg,#0ea5e9,#6366f1)',
        icon: fileTypeIconName(ext),
    }
}

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

const type = computed(() => props.file.type ?? '')
const isImage = computed(() => fileGetIsImage(type.value))
const isVideo = computed(() => type.value.startsWith('video/'))
const isSuccessful = computed(
    () => props.file.status === UploadStatus.SUCCESSFUL,
)
const thumb = computed(() => nonMediaThumb(type.value, props.file.name))
const thumbStyle = computed(() =>
    isImage.value
        ? { backgroundImage: `url(${props.file.url ?? ''})` }
        : isVideo.value
          ? undefined
          : { background: thumb.value.gradient },
)
const progress = computed(() => {
    const p = filesProgressMap.value[props.file.id]
    const loaded = p?.loaded ?? NaN
    const total = p?.total ?? NaN
    const pct = Math.floor((loaded / total) * 100)
    // No progress entry ⇒ NaN; total === 0 ⇒ Infinity. Either would render
    // width:NaN%/aria-valuenow=NaN in ProgressBar while an upload is active.
    return Number.isFinite(pct) ? pct : 0
})

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
        :class="
            cn(
                'upup-fx-hover-lift upup-flex upup-w-full upup-items-center upup-gap-3 upup-rounded-xl upup-px-3 upup-py-2.5 upup-ring-1',
                dark
                    ? 'upup-bg-white/[0.04] upup-ring-white/[0.07]'
                    : 'upup-bg-black/[0.04] upup-ring-black/[0.06]',
            )
        "
    >
        <div
            class="upup-relative upup-flex upup-h-10 upup-w-10 upup-flex-none upup-items-center upup-justify-center upup-overflow-hidden upup-rounded-[9px] upup-bg-center upup-bg-cover upup-bg-no-repeat"
            :style="thumbStyle"
        >
            <!-- Real first-frame video thumbnail (no controls chrome). Uses the
                 local object URL, which persists through upload (updateFile keeps
                 `url`), so the preview survives a completed run. -->
            <video
                v-if="isVideo"
                :src="file.url ?? ''"
                muted
                playsinline
                preload="metadata"
                class="upup-pointer-events-none upup-absolute upup-inset-0 upup-h-full upup-w-full upup-object-cover"
            />
            <Icon
                v-if="!isImage && !isVideo"
                :name="thumb.icon"
                :size="20"
                class="upup-text-white"
            />
        </div>

        <div class="upup-flex upup-min-w-0 upup-flex-1 upup-flex-col upup-gap-0.5">
            <div
                :class="
                    cn(
                        'upup-truncate upup-text-[13px]',
                        dark ? 'upup-text-[#e2e8f0]' : 'upup-text-gray-900',
                    )
                "
            >
                {{ file.name }}
            </div>
            <div
                :class="
                    cn(
                        'upup-text-[12px]',
                        dark ? 'upup-text-[#94a3b8]' : 'upup-text-gray-500',
                    )
                "
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
            v-if="isSuccessful"
            :index="index ?? 0"
            :size="22"
            class="upup-flex-none"
        />

        <!-- Once a file has uploaded successfully its delete control is gone —
             the completion check is the only trailing affordance. -->
        <button
            v-if="!isSuccessful"
            :class="
                cn(
                    'upup-fx-remove upup-fx-press upup-flex upup-h-8 upup-w-8 upup-flex-none upup-items-center upup-justify-center upup-rounded-lg',
                    dark
                        ? 'upup-text-[#64748b] hover:upup-bg-white/[0.06]'
                        : 'upup-text-gray-500 hover:upup-bg-black/[0.06]',
                    'disabled:upup-cursor-not-allowed disabled:upup-opacity-50',
                )
            "
            @click="onRemove"
            type="button"
            :disabled="!!progress"
            :aria-label="tr.removeFile"
            data-testid="upup-file-remove"
        >
            <component :is="FileDeleteIcon" class="upup-h-5 upup-w-5" />
        </button>
    </div>
</template>
