<script setup lang="ts">
import { computed, ref } from 'vue'
import { useVirtualizer } from '@tanstack/vue-virtual'
import { formatUiMessage as t, pluralUiMessage as plural, UploadStatus } from '@upupjs/core'
import { isUploadActive, cn } from '@upupjs/core/internal'
import {
    useUploaderFiles,
    useUploaderI18n,
    useUploaderOptions,
    useUploaderSource,
    useUploaderTheme,
    useUploaderUploadControls,
    useUploaderView,
} from '../context/uploader-context'
import Icon from './Icon'
import FileItem from './FileItem.vue'
import FileHero from './FileHero.vue'
import UploaderHeader from './shared/UploaderHeader.vue'
import ProgressBar from './shared/ProgressBar.vue'

const VIRTUAL_SCROLL_THRESHOLD = 20
const ESTIMATED_ITEM_HEIGHT = 76

function formatBytes(bytes: number): string {
    if (bytes === 0) return '0 B'
    const k = 1024
    const sizes = ['B', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i]
}

function formatEta(seconds: number): string {
    if (seconds <= 0 || !isFinite(seconds)) return ''
    const m = Math.floor(seconds / 60)
    const s = seconds % 60
    if (m > 0) return `${m}m ${s}s left`
    return `${s}s left`
}

const { viewMode, sourceOverlayOpen, openSourceOverlay } = useUploaderView()
const { activeSource } = useUploaderSource()
const { files, leavingFileIds } = useUploaderFiles()
const { translations: tr } = useUploaderI18n()
const {
    upload: {
        startUpload,
        retryUpload,
        uploadStatus,
        uploadError,
        uploadErrorCode,
        totalProgress,
        uploadSpeed,
        uploadEta,
        uploadedBytes,
        totalBytes,
    },
    handleDone,
    handleCancel,
    handlePause,
    handleResume,
} = useUploaderUploadControls()
const {
    isProcessing,
    resumable,
    limit,
    icons: { ContainerAddMoreIcon },
} = useUploaderOptions()
const { isDark: dark, slotOverrides: slotClasses, slots: themeSlots } = useUploaderTheme()

const scrollRef = ref<HTMLDivElement | null>(null)

const sortedFiles = computed(() =>
    Array.from(files.value.values()).sort((a, b) => {
        const pa = a.relativePath || a.name
        const pb = b.relativePath || b.name
        return pa.localeCompare(pb) || a.name.localeCompare(b.name)
    }),
)

const isSingle = computed(() => sortedFiles.value.length === 1)

const shouldVirtualize = computed(
    () => sortedFiles.value.length >= VIRTUAL_SCROLL_THRESHOLD && viewMode.value !== 'grid',
)

const virtualizer = useVirtualizer(
    computed(() => ({
        count: sortedFiles.value.length,
        getScrollElement: () => scrollRef.value,
        estimateSize: () => ESTIMATED_ITEM_HEIGHT,
        overscan: 5,
        enabled: shouldVirtualize.value,
    })),
)

const virtualItems = computed(() => virtualizer.value.getVirtualItems())
const virtualRows = computed(() =>
    virtualItems.value.flatMap((virtualItem) => {
        const file = sortedFiles.value[virtualItem.index]
        return file ? [{ virtualItem, file }] : []
    }),
)
const totalSize = computed(() => virtualizer.value.getTotalSize())

const isUploading = computed(() => isUploadActive(uploadStatus.value))
// When the add-more source surface is up (overlay open, or a source chosen
// while files exist), this list stays mounted but dimmed and inert behind it.
const dimmed = computed(() => sourceOverlayOpen.value || !!activeSource.value)
const heroLeaving = computed(
    () =>
        isSingle.value &&
        !!sortedFiles.value[0] &&
        leavingFileIds.value.has(sortedFiles.value[0].id),
)
const canAddMore = computed(
    () =>
        limit > 1 &&
        files.value.size < limit &&
        !isUploading.value &&
        !isProcessing,
)

function onUploadClick() {
    void startUpload().catch(() => undefined)
}

function onRetryClick() {
    void retryUpload().catch(() => undefined)
}
</script>

<template>
    <div
        data-testid="upup-file-list"
        data-upup-slot="file-list"
        :inert="dimmed || undefined"
        :class="cn(
            'upup-relative upup-flex upup-h-full upup-flex-col upup-rounded-lg upup-shadow',
            {
                'upup-hidden': !files.size,
                'upup-opacity-40 upup-pointer-events-none': dimmed,
            },
            themeSlots?.fileList?.root,
        )"
    >
        <div role="status" aria-live="polite" class="upup-sr-only">
            {{ t(plural(tr, 'filesSelected', files.size), { count: files.size }) }}
        </div>

        <UploaderHeader :handle-cancel="handleCancel" />

        <div
            ref="scrollRef"
            :class="cn(
                'upup-preview-scroll upup-flex upup-flex-1 upup-flex-col upup-overflow-y-auto upup-p-3',
                dark ? 'upup-bg-transparent' : 'upup-bg-black/[0.075]',
                slotClasses.fileListContainer,
            )"
        >
            <!-- Single-file HERO -->
            <div
                v-if="isSingle"
                role="list"
                :class="cn(
                    'upup-animate-fx-enter upup-flex upup-min-h-0 upup-flex-1 upup-flex-col',
                    heroLeaving && 'upup-animate-fx-exit upup-overflow-hidden',
                )"
            >
                <FileHero :file="sortedFiles[0]!" />
            </div>

            <!-- Virtualized list -->
            <div
                v-else-if="shouldVirtualize"
                role="list"
                data-upup-slot="file-list-virtual"
                :style="{ height: totalSize + 'px', position: 'relative' }"
                :class="cn(
                    isProcessing && 'upup-pointer-events-none upup-opacity-75',
                    'upup-font-[Arial,Helvetica,sans-serif]',
                )"
            >
                <div
                    v-for="{ virtualItem, file } in virtualRows"
                    :key="String(virtualItem.key)"
                    :data-index="virtualItem.index"
                    :style="{
                        position: 'absolute',
                        top: 0,
                        left: 0,
                        width: '100%',
                        transform: `translateY(${virtualItem.start}px)`,
                        paddingBottom: '12px',
                    }"
                >
                    <FileItem :file="file" :index="virtualItem.index" />
                </div>
            </div>

            <!-- Standard rendering -->
            <div
                v-else
                role="list"
                :class="cn(
                    `${isProcessing ? 'upup-pointer-events-none upup-opacity-75' : ''} upup-flex upup-flex-col upup-gap-3 upup-font-[Arial,Helvetica,sans-serif]`,
                    {
                        'md:upup-grid md:upup-gap-y-6': files.size > 1 && viewMode === 'grid',
                        'md:upup-grid-cols-2': files.size > 1 && viewMode === 'grid',
                        [slotClasses.fileListContainerInnerMultiple!]:
                            slotClasses.fileListContainerInnerMultiple && files.size > 1,
                        [slotClasses.fileListContainerInnerSingle!]:
                            slotClasses.fileListContainerInnerSingle && files.size === 1,
                    },
                )"
            >
                <FileItem
                    v-for="(file, index) in sortedFiles"
                    :key="file.id"
                    :file="file"
                    :index="index"
                />
            </div>

            <!-- Full-width dashed "Add more" row (spec §4 state 3): a second
                 add-more affordance beneath the list/hero, opening the overlay. -->
            <button
                v-if="canAddMore"
                data-testid="upup-add-more"
                data-placement="footer"
                data-upup-slot="add-more"
                :class="cn(
                    'upup-fx-hover-lift upup-fx-press upup-mt-2.5 upup-flex upup-flex-none upup-items-center upup-justify-center upup-gap-2 upup-rounded-xl upup-border-[1.5px] upup-border-dashed upup-px-3 upup-py-2.5 upup-text-[13px] upup-font-medium',
                    dark
                        ? 'upup-border-white/[0.16] upup-text-[#94a3b8]'
                        : 'upup-border-black/[0.16] upup-text-gray-500',
                    slotClasses.containerAddMoreButton,
                )"
                @click="openSourceOverlay"
                :disabled="isUploading || isProcessing"
            >
                <component :is="ContainerAddMoreIcon" />
                {{ tr.addMore }}
            </button>
        </div>

        <div
            :class="cn(
                'upup-shadow-top upup-flex upup-items-center upup-gap-3 upup-rounded-b-lg upup-bg-black/[0.025] upup-px-3 upup-py-2',
                { 'upup-bg-white/5 dark:upup-bg-white/5': dark },
                slotClasses.fileListFooter,
            )"
        >
            <template
                v-if="uploadStatus !== UploadStatus.SUCCESSFUL && uploadStatus !== UploadStatus.FAILED"
            >
                <button
                    data-testid="upup-upload-btn"
                    :class="cn(
                        'upup-fx-sheen-sweep upup-fx-press upup-disabled:animate-pulse upup-ml-auto upup-rounded-full upup-bg-[#0ea5e9] upup-px-4 upup-py-2 upup-text-sm upup-font-medium upup-text-white',
                        { 'upup-bg-[#38bdf8] dark:upup-bg-[#38bdf8]': dark },
                        slotClasses.uploadButton,
                    )"
                    @click="onUploadClick"
                    :disabled="isUploadActive(uploadStatus) || uploadStatus === UploadStatus.PAUSED || isProcessing"
                >
                    {{ t(plural(tr, 'uploadFiles', files.size), { count: files.size }) }}
                </button>
            </template>
            <template v-if="uploadStatus === UploadStatus.FAILED && uploadError">
                <p
                    data-testid="upup-upload-error"
                    data-upup-slot="upload-error"
                    :title="uploadErrorCode"
                    class="upup-mr-auto upup-text-sm upup-text-red-600 dark:upup-text-red-400"
                >
                    {{ uploadErrorCode ? t(tr.uploadFailedWithCode, { code: uploadErrorCode }) : t(tr.uploadFailed, { message: uploadError }) }}
                </p>
            </template>
            <template v-if="uploadStatus === UploadStatus.FAILED">
                <button
                    data-testid="upup-retry-btn"
                    :class="cn(
                        'upup-fx-press upup-disabled:animate-pulse upup-ml-auto upup-rounded-full upup-bg-red-600 upup-px-4 upup-py-2 upup-text-sm upup-font-medium upup-text-white',
                        { 'upup-bg-red-500 dark:upup-bg-red-500': dark },
                        slotClasses.uploadButton,
                    )"
                    @click="onRetryClick"
                >
                    {{ resumable?.protocol === 'multipart' ? tr.resumeUpload : tr.retryUpload }}
                </button>
            </template>
            <template v-if="uploadStatus === UploadStatus.SUCCESSFUL">
                <button
                    :class="cn(
                        'upup-fx-sheen-sweep upup-fx-press upup-disabled:animate-pulse upup-ml-auto upup-rounded-lg upup-bg-[#0ea5e9] upup-px-3 upup-py-2 upup-text-sm upup-font-medium upup-text-white',
                        { 'upup-bg-[#38bdf8] dark:upup-bg-[#38bdf8]': dark },
                        slotClasses.uploadDoneButton,
                    )"
                    @click="handleDone"
                >
                    {{ tr.done }}
                </button>
            </template>
            <div class="upup-flex upup-flex-1 upup-flex-col upup-gap-1">
                <div class="upup-flex upup-items-center upup-gap-2">
                    <template
                        v-if="
                            resumable?.protocol === 'multipart' &&
                            (isUploadActive(uploadStatus) || uploadStatus === UploadStatus.PAUSED)
                        "
                    >
                        <button
                            data-testid="upup-upload-pause-toggle"
                            :class="cn(
                                'upup-flex upup-h-7 upup-w-7 upup-items-center upup-justify-center upup-rounded-full upup-bg-gray-200 upup-text-gray-700 upup-transition-colors hover:upup-bg-gray-300',
                                { 'upup-bg-white/10 upup-text-white hover:upup-bg-white/20': dark },
                            )"
                            @click="uploadStatus === UploadStatus.PAUSED ? handleResume() : handlePause()"
                            :aria-label="uploadStatus === UploadStatus.PAUSED ? tr.resumeUpload : tr.pauseUpload"
                            :title="uploadStatus === UploadStatus.PAUSED ? tr.resumeUpload : tr.pauseUpload"
                        >
                            <Icon v-if="uploadStatus === UploadStatus.PAUSED" name="player-play" :size="14" />
                            <Icon v-else name="player-pause" :size="14" />
                        </button>
                        <button
                            data-testid="upup-upload-cancel-btn"
                            :class="cn(
                                'upup-flex upup-h-7 upup-w-7 upup-items-center upup-justify-center upup-rounded-full upup-bg-red-100 upup-text-red-700 upup-transition-colors hover:upup-bg-red-200',
                                { 'upup-bg-red-500/20 upup-text-red-100 hover:upup-bg-red-500/30': dark },
                            )"
                            @click="handleCancel"
                            :aria-label="tr.cancel"
                            :title="tr.cancel"
                        >
                            <Icon name="x" :size="14" />
                        </button>
                    </template>
                    <ProgressBar
                        class="upup-flex-1"
                        progress-bar-class-name="upup-rounded"
                        :progress="totalProgress"
                        :show-value="true"
                    />
                </div>
                <template
                    v-if="(isUploadActive(uploadStatus) || uploadStatus === UploadStatus.PAUSED) && totalBytes > 0"
                >
                    <div
                        :class="cn(
                            'upup-flex upup-items-center upup-justify-between upup-text-[11px] upup-text-gray-500',
                            { 'upup-text-gray-400': dark },
                        )"
                    >
                        <span>
                            {{ formatBytes(uploadedBytes) }} of {{ formatBytes(totalBytes) }}
                            <template v-if="uploadSpeed > 0">
                                &middot; {{ formatBytes(uploadSpeed) }}/s
                            </template>
                        </span>
                        <template v-if="isUploadActive(uploadStatus) && uploadEta > 0">
                            <span>{{ formatEta(uploadEta) }}</span>
                        </template>
                        <template v-if="uploadStatus === UploadStatus.PAUSED">
                            <span>{{ tr.paused }}</span>
                        </template>
                    </div>
                </template>
            </div>
        </div>
    </div>
</template>
